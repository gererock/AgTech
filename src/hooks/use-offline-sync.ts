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

  const refreshPendingCount = useCallback(async () => {
    try {
      const db = getAgroOfflineDb();
      const [tripCount, workOrderCount] = await Promise.all([
        db.trips.where("syncStatus").equals("pending").count(),
        db.workOrders.where("syncStatus").equals("pending").count()
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
        db.trips.where("syncStatus").equals("pending").toArray(),
        db.workOrders.where("syncStatus").equals("pending").toArray()
      ]);

      const syncedIds: string[] = [];

      if (pendingTrips.length > 0) {
        const response = await postRecords<TripSyncRecord>("/api/trips/sync", pendingTrips);
        await markTripsAsSynced(pendingTrips, response.syncedIds);
        syncedIds.push(...response.syncedIds);
      }

      if (pendingWorkOrders.length > 0) {
        const response = await postRecords<WorkOrderSyncRecord>(
          "/api/work-orders/sync",
          pendingWorkOrders
        );
        await markWorkOrdersAsSynced(pendingWorkOrders, response.syncedIds);
        syncedIds.push(...response.syncedIds);
      }

      await refreshPendingCount();
      return { ok: true, syncedIds };
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
            lastError: undefined
          })
        )
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
            lastError: undefined
          })
        )
    );
  });
}

async function safeReadError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected sync error";
}
