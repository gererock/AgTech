"use client";

import { useEffect } from "react";

const SYNC_TAG = "agro-offline-sync";

type SyncRegistration = ServiceWorkerRegistration & {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
};

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void cleanupDevelopmentServiceWorkers();
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const dispatchClientSync = () => {
      window.dispatchEvent(new Event("agro:sync-pending"));
    };

    const queueBackgroundSync = async () => {
      if (!registration) {
        dispatchClientSync();
        return;
      }

      const syncRegistration = registration as SyncRegistration;

      if (syncRegistration.sync) {
        await syncRegistration.sync.register(SYNC_TAG);
        return;
      }

      registration.active?.postMessage({ type: "QUEUE_SYNC" });
      dispatchClientSync();
    };

    const handleOnline = () => {
      void queueBackgroundSync();
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_PENDING") {
        dispatchClientSync();
      }
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registeredWorker) => {
        registration = registeredWorker;

        if (navigator.onLine) {
          void queueBackgroundSync();
        }
      })
      .catch((error: unknown) => {
        console.warn("Service worker registration failed", error);
      });

    window.addEventListener("online", handleOnline);
    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}

async function cleanupDevelopmentServiceWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    }
  } catch (error) {
    console.warn("Development service worker cleanup failed", error);
  }
}
