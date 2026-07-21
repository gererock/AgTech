"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createOfflineTrip,
  createOfflineWorkOrder,
  getAgroOfflineDb,
  type OfflineTrip,
  type OfflineWorkOrder,
  type TripDraft,
  type WorkOrderDraft
} from "@/lib/local-db";
import type { SyncResponse, TripSyncRecord, WorkOrderSyncRecord } from "@/lib/sync-contracts";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface SaveResult {
  id: string;
  queued: boolean;
  synced: boolean;
}

interface SyncResult {
  ok: boolean;
  syncedIds: string[];
  error?: string;
}

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const MAX_SYNC_RETRY = 3;

  const refreshPendingCount = useCallback(async () => {
    try {
      const db = getAgroOfflineDb();
      const [tripCount, workOrderCount] = await Promise.all([
        db.trips.where("syncStatus").notEqual("synced").count(),
        db.workOrders.where("syncStatus").notEqual("synced").count()
      ]);

      setPendingCount(tripCount + workOrderCount);
    } catch (error) {
      setLastSyncError(getErrorMessage(error));
    }
  }, []);

  const syncPending = useCallback(async (): Promise<SyncResult> => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await refreshPendingCount();
      return { ok: false, syncedIds: [], error: "Device is offline" };
    }

    setIsSyncing(true);
    setLastSyncError(null);

    try {
      const db = getAgroOfflineDb();
      const [pendingTrips, pendingWorkOrders] = await Promise.all([
        db.trips.where("syncStatus").notEqual("synced").toArray(),
        db.workOrders.where("syncStatus").notEqual("synced").toArray()
      ]);

      const syncedIds: string[] = [];
      let allOk = true;

      if (pendingTrips.length > 0) {
        const response = await postRecords<TripSyncRecord>("/api/trips/sync", pendingTrips);
        await markTripsAsSynced(pendingTrips, response.syncedIds);
        syncedIds.push(...response.syncedIds);

        if (response.failedRecords?.length) {
          allOk = false;
          await markTripsAsFailed(pendingTrips, response.failedRecords, MAX_SYNC_RETRY);
        }
      }

      if (pendingWorkOrders.length > 0) {
        const response = await postRecords<WorkOrderSyncRecord>(
          "/api/work-orders/sync",
          pendingWorkOrders
        );
        await markWorkOrdersAsSynced(pendingWorkOrders, response.syncedIds);
        syncedIds.push(...response.syncedIds);

        if (response.failedRecords?.length) {
          allOk = false;
          await markWorkOrdersAsFailed(pendingWorkOrders, response.failedRecords, MAX_SYNC_RETRY);
        }
      }

      await refreshPendingCount();
      return { ok: allOk, syncedIds, error: allOk ? undefined : "Some records failed to sync" };
    } catch (error) {
      const message = getErrorMessage(error);
      setLastSyncError(message);
      await refreshPendingCount();
      return { ok: false, syncedIds: [], error: message };
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  const saveTrip = useCallback(
    async (draft: TripDraft): Promise<SaveResult> => {
      const db = getAgroOfflineDb();
      const record = createOfflineTrip(draft);

      await db.trips.put(record);
      await refreshPendingCount();

      if (!isOnline) {
        return { id: record.id, queued: true, synced: false };
      }

      const syncResult = await syncPending();
      return { id: record.id, queued: !syncResult.ok, synced: syncResult.syncedIds.includes(record.id) };
    },
    [isOnline, refreshPendingCount, syncPending]
  );

  const saveWorkOrder = useCallback(
    async (draft: WorkOrderDraft): Promise<SaveResult> => {
      const db = getAgroOfflineDb();
      const record = createOfflineWorkOrder(draft);

      await db.workOrders.put(record);
      await refreshPendingCount();

      if (!isOnline) {
        return { id: record.id, queued: true, synced: false };
      }

      const syncResult = await syncPending();
      return { id: record.id, queued: !syncResult.ok, synced: syncResult.syncedIds.includes(record.id) };
    },
    [isOnline, refreshPendingCount, syncPending]
  );

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    if (isOnline) {
      void syncPending();
    }
  }, [isOnline, syncPending]);

  useEffect(() => {
    const handleSyncRequest = () => {
      void syncPending();
    };

    window.addEventListener("agro:sync-pending", handleSyncRequest);

    return () => {
      window.removeEventListener("agro:sync-pending", handleSyncRequest);
    };
  }, [syncPending]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncError,
    refreshPendingCount,
    saveTrip,
    saveWorkOrder,
    syncPending
  };
}

async function postRecords<TRecord extends { id: string }>(url: string, records: TRecord[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ records })
  });

  if (!response.ok) {
    const body = await safeReadError(response);
    throw new Error(body || `Sync failed with status ${response.status}`);
  }

  const payload = (await response.json()) as SyncResponse;

  if (!Array.isArray(payload.syncedIds)) {
    throw new Error("Sync response did not include synced IDs");
  }

  return payload;
}

async function markTripsAsSynced(records: OfflineTrip[], syncedIds: string[]) {
  const db = getAgroOfflineDb();
  const syncedAt = new Date().toISOString();
  const syncedIdSet = new Set(syncedIds);

  await db.transaction("rw", db.trips, async () => {
    await Promise.all(
      records
        .filter((record) => syncedIdSet.has(record.id))
        .map((record) =>
          db.trips.update(record.id, {
            synced: true,
            syncStatus: "synced",
            syncedAt,
            lastError: undefined,
            retryCount: 0
          })
        )
    );
  });
}

async function markTripsAsFailed(records: OfflineTrip[], failedRecords: { id: string; error: string }[], maxRetry: number) {
  const db = getAgroOfflineDb();
  const failedById = new Map(failedRecords.map((failure) => [failure.id, failure]));

  await db.transaction("rw", db.trips, async () => {
    await Promise.all(
      records.map(async (record) => {
        if (!failedById.has(record.id)) {
          return;
        }

        const failure = failedById.get(record.id)!;
        const existing = await db.trips.get(record.id);

        if (!existing) {
          return;
        }

        const retryCount = Math.min(existing.retryCount + 1, maxRetry);
        const syncStatus = retryCount >= maxRetry ? "failed" : "pending";

        await db.trips.update(record.id, {
          synced: false,
          syncStatus,
          lastError: failure.error,
          retryCount,
          updatedAt: new Date().toISOString()
        });
      })
    );
  });
}

async function markWorkOrdersAsSynced(records: OfflineWorkOrder[], syncedIds: string[]) {
  const db = getAgroOfflineDb();
  const syncedAt = new Date().toISOString();
  const syncedIdSet = new Set(syncedIds);

  await db.transaction("rw", db.workOrders, async () => {
    await Promise.all(
      records
        .filter((record) => syncedIdSet.has(record.id))
        .map((record) =>
          db.workOrders.update(record.id, {
            synced: true,
            syncStatus: "synced",
            syncedAt,
            lastError: undefined,
            retryCount: 0
          })
        )
    );
  });
}

async function markWorkOrdersAsFailed(records: OfflineWorkOrder[], failedRecords: { id: string; error: string }[], maxRetry: number) {
  const db = getAgroOfflineDb();
  const failedById = new Map(failedRecords.map((failure) => [failure.id, failure]));

  await db.transaction("rw", db.workOrders, async () => {
    await Promise.all(
      records.map(async (record) => {
        if (!failedById.has(record.id)) {
          return;
        }

        const failure = failedById.get(record.id)!;
        const existing = await db.workOrders.get(record.id);

        if (!existing) {
          return;
        }

        const retryCount = Math.min(existing.retryCount + 1, maxRetry);
        const syncStatus = retryCount >= maxRetry ? "failed" : "pending";

        await db.workOrders.update(record.id, {
          synced: false,
          syncStatus,
          lastError: failure.error,
          retryCount,
          updatedAt: new Date().toISOString()
        });
      })
    );
  });
}

async function safeReadError(response: Response) {
  const body = await response.text();
  try {
    const json = JSON.parse(body);
    if (json?.error) {
      return String(json.error);
    }
    return body;
  } catch {
    return body;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
