"use client";

import Dexie, { type Table } from "dexie";
import type { TripSyncRecord, WorkOrderSyncRecord } from "@/lib/sync-contracts";

export type LocalSyncStatus = "pending" | "failed" | "synced";

export interface LocalSyncMetadata {
  synced: boolean;
  syncStatus: LocalSyncStatus;
  syncedAt?: string;
  lastError?: string;
  retryCount: number;
}

export type OfflineTrip = TripSyncRecord & LocalSyncMetadata;
export type OfflineWorkOrder = WorkOrderSyncRecord & LocalSyncMetadata;

export type TripDraft = Omit<TripSyncRecord, "id" | "status" | "createdAt" | "updatedAt"> & {
  status?: TripSyncRecord["status"];
};

export type WorkOrderDraft = Omit<WorkOrderSyncRecord, "id" | "createdAt" | "updatedAt"> & {
  chemicals?: Array<{
    inventoryItemId?: string | null;
    product: string;
    quantity: number;
    unit: string;
  }>;
};

class AgroOfflineDatabase extends Dexie {
  trips!: Table<OfflineTrip, string>;
  workOrders!: Table<OfflineWorkOrder, string>;

  constructor() {
    super("agro-operativo-offline");

    this.version(1).stores({
      trips: "id, syncStatus, updatedAt, licensePlate, retryCount",
      workOrders: "id, syncStatus, updatedAt, machinery, retryCount"
    });
  }
}

let database: AgroOfflineDatabase | null = null;

export function getAgroOfflineDb() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }

  if (!database) {
    database = new AgroOfflineDatabase();
  }

  return database;
}

export function createOfflineTrip(draft: TripDraft): OfflineTrip {
  const now = new Date().toISOString();

  return {
    id: createClientId(),
    truck: draft.truck || null,
    licensePlate: draft.licensePlate.trim().toUpperCase(),
    driverId: draft.driverId || null,
    driverName: draft.driverName.trim(),
    origin: draft.origin?.trim() || "Sin informar",
    destination: draft.destination?.trim() || "Sin informar",
    product: draft.product.trim(),
    estimatedKg: draft.estimatedKg,
    loadedKg: draft.loadedKg ?? null,
    destinationKg: draft.destinationKg ?? null,
    fuelLiters: draft.fuelLiters ?? 0,
    fuelItemId: draft.fuelItemId || null,
    agroItemId: draft.agroItemId || null,
    status: draft.status ?? "PENDING",
    createdAt: now,
    updatedAt: now,
    synced: false,
    syncStatus: "pending",
    retryCount: 0
  };
}

export function createOfflineWorkOrder(draft: WorkOrderDraft): OfflineWorkOrder {
  const now = new Date().toISOString();

  return {
    id: createClientId(),
    machinery: draft.machinery.trim(),
    operatorId: draft.operatorId || null,
    operatorName: draft.operatorName.trim(),
    initialHourMeter: draft.initialHourMeter,
    finalHourMeter: draft.finalHourMeter,
    hectaresWorked: draft.hectaresWorked,
    fuelLiters: draft.fuelLiters,
    fuelItemId: draft.fuelItemId || null,
    plot: draft.plot?.trim() || "Sin informar",
    customer: draft.customer?.trim() || "Sin informar",
    chemicals: draft.chemicals ?? [],
    createdAt: now,
    updatedAt: now,
    synced: false,
    syncStatus: "pending",
    retryCount: 0
  };
}

function createClientId() {
  const browserCrypto = globalThis.crypto;

  if (browserCrypto.randomUUID) {
    return browserCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  browserCrypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}
