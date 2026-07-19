"use client";

import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineStatusBannerProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncError?: string | null;
  onSync: () => void;
}

export function OfflineStatusBanner({
  isOnline,
  pendingCount,
  isSyncing,
  lastSyncError,
  onSync
}: OfflineStatusBannerProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 border-b px-4 py-3 shadow-sm backdrop-blur",
        isOnline ? "border-teal-200 bg-white/92" : "border-amber-300 bg-amber-50/95"
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              isOnline ? "bg-teal-700 text-white" : "bg-amber-400 text-slate-950"
            )}
            aria-hidden="true"
          >
            {isOnline ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-950">
              {isOnline ? "Online" : "Offline"}
              <span className="ml-2 font-semibold text-slate-600">
                {pendingCount === 1
                  ? "1 pendiente"
                  : `${pendingCount} pendientes`}
              </span>
            </p>
            {lastSyncError ? (
              <p className="truncate text-xs font-semibold text-red-700">{lastSyncError}</p>
            ) : (
              <p className="truncate text-xs font-semibold text-slate-600">
                {isSyncing ? "Sincronizando registros..." : "Listo para cargar datos"}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={!isOnline || isSyncing}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-900 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-45"
          aria-label="Sincronizar pendientes"
          title="Sincronizar pendientes"
        >
          <RefreshCw className={cn("h-5 w-5", isSyncing && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
