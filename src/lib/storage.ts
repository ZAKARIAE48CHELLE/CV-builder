import { get, set, del, keys } from "idb-keyval";
import { isSupabaseConfigured } from "./supabase/client";

const isBrowser = typeof window !== "undefined";

function shouldUseServerFileDb(): boolean {
  if (!isBrowser) return false;
  if (isSupabaseConfigured()) return false;
  // Skip relative /api/db calls inside jsdom test environment
  if (typeof process !== "undefined" && process.env.VITEST) return false;
  return true;
}

export const storageAdapter = {
  async getItem<T>(key: string): Promise<T | null> {
    if (!isBrowser) return null;

    // 1. In Local Mode on a local dev/desktop server, attempt to fetch from /api/db
    if (shouldUseServerFileDb()) {
      try {
        const res = await fetch("/api/db", { method: "GET" });
        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            const serverData = json.data as Record<string, any>;
            if (serverData[key] !== undefined && serverData[key] !== null) {
              try {
                if (window.indexedDB) await set(key, serverData[key]);
                window.localStorage.setItem(key, JSON.stringify(serverData[key]));
              } catch {}
              return serverData[key] as T;
            }
          }
        }
      } catch (apiErr) {
        console.warn("Storage getItem API call failed, falling back to local:", apiErr);
      }
    }

    // 2. Fall back to IndexedDB
    try {
      if (window.indexedDB) {
        const val = await get<T>(key);
        if (val !== undefined && val !== null) {
          if (shouldUseServerFileDb()) {
            this.syncToServer(key, val).catch(() => {});
          }
          return val;
        }
      }
    } catch (idbErr) {
      console.warn("Storage getItem IndexedDB error:", idbErr);
    }

    // 3. Fall back to localStorage
    try {
      const localVal = window.localStorage.getItem(key);
      if (localVal) {
        const parsed = JSON.parse(localVal) as T;
        if (shouldUseServerFileDb()) {
          this.syncToServer(key, parsed).catch(() => {});
        }
        return parsed;
      }
    } catch {}

    return null;
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    if (!isBrowser) return;

    // 1. Immediately persist to browser storage
    try {
      if (window.indexedDB) {
        await set(key, value);
      }
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // localStorage might be full for large payload, indexedDB still succeeded
      }
    } catch (err) {
      console.warn("Storage setItem local error:", err);
    }

    // 2. Persist to local server file database if in local mode
    if (shouldUseServerFileDb()) {
      await this.syncToServer(key, value);
    }
  },

  async syncToServer<T>(key: string, value: T): Promise<void> {
    if (!shouldUseServerFileDb()) return;
    try {
      let currentDb: Record<string, any> = {};
      try {
        const res = await fetch("/api/db", { method: "GET" });
        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            currentDb = json.data;
          }
        }
      } catch {}

      currentDb[key] = value;

      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentDb),
      });
    } catch (serverErr) {
      console.warn("Failed to sync storage to server database:", serverErr);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!isBrowser) return;
    try {
      if (window.indexedDB) {
        await del(key);
      }
      window.localStorage.removeItem(key);
    } catch {}

    if (shouldUseServerFileDb()) {
      try {
        let currentDb: Record<string, any> = {};
        const res = await fetch("/api/db", { method: "GET" });
        if (res.ok) {
          const json = await res.json();
          if (json?.data) currentDb = json.data;
        }
        delete currentDb[key];
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentDb),
        });
      } catch (err) {
        console.warn("Failed to delete key from server database:", err);
      }
    }
  },

  async clearAll(): Promise<void> {
    if (!isBrowser) return;
    try {
      if (window.indexedDB) {
        const allKeys = await keys();
        for (const k of allKeys) {
          await del(k);
        }
      }
      window.localStorage.clear();
    } catch {}

    if (shouldUseServerFileDb()) {
      try {
        await fetch("/api/db", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      } catch (err) {
        console.warn("Failed to clear server database:", err);
      }
    }
  },
};
