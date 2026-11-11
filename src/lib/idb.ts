/**
 * Where captures, folders and kept pictures live: this browser's IndexedDB.
 *
 * This is the only module that writes to IndexedDB, and every record is
 * checked by the identifier guard first. The rules check enforces both.
 *
 * If the browser has no IndexedDB (some private modes), koa falls back to
 * memory and says so: captures then last only until the tab closes.
 */

import { deepRefusal } from "./guards.ts";
import type { WriteResult } from "./local-store.ts";

export const DB_NAME = "koa";
export const DB_VERSION = 1;

export type StoreName = "folders" | "captures" | "files";
export const STORES: StoreName[] = ["folders", "captures", "files"];

export interface RecordStore {
  /** False when records are held in memory only. */
  readonly durable: boolean;
  getAll<T>(store: StoreName): Promise<T[]>;
  get<T>(store: StoreName, id: string): Promise<T | undefined>;
  put<T extends { id: string }>(store: StoreName, value: T): Promise<WriteResult>;
  remove(store: StoreName, id: string): Promise<void>;
  clear(): Promise<void>;
}

function guard(value: unknown): WriteResult {
  const reason = deepRefusal(value);
  return reason ? { ok: false, reason } : { ok: true };
}

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function finished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

/** Opens the koa database in the given IndexedDB (the browser's by default). */
export async function openIdbStore(factory: IDBFactory = indexedDB, name: string = DB_NAME): Promise<RecordStore> {
  const open = factory.open(name, DB_VERSION);
  open.onupgradeneeded = () => {
    for (const store of STORES) {
      if (!open.result.objectStoreNames.contains(store)) open.result.createObjectStore(store, { keyPath: "id" });
    }
  };
  const db = await done(open);

  return {
    durable: true,
    getAll<T>(store: StoreName) {
      return done(db.transaction(store, "readonly").objectStore(store).getAll() as IDBRequest<T[]>);
    },
    get<T>(store: StoreName, id: string) {
      return done(db.transaction(store, "readonly").objectStore(store).get(id) as IDBRequest<T | undefined>);
    },
    async put<T extends { id: string }>(store: StoreName, value: T) {
      const checked = guard(value);
      if (!checked.ok) return checked;
      try {
        const transaction = db.transaction(store, "readwrite");
        transaction.objectStore(store).put(value);
        await finished(transaction);
        return { ok: true };
      } catch {
        return { ok: false, reason: "This browser would not save. Its storage may be full or switched off." };
      }
    },
    async remove(store: StoreName, id: string) {
      const transaction = db.transaction(store, "readwrite");
      transaction.objectStore(store).delete(id);
      await finished(transaction);
    },
    async clear() {
      const transaction = db.transaction(STORES, "readwrite");
      for (const store of STORES) transaction.objectStore(store).clear();
      await finished(transaction);
    },
  };
}

/** The same interface held in memory. Used as a fallback and in tests. */
export function memoryStore(): RecordStore {
  const data: Record<StoreName, Map<string, unknown>> = {
    folders: new Map(),
    captures: new Map(),
    files: new Map(),
  };
  return {
    durable: false,
    async getAll<T>(store: StoreName) {
      return [...data[store].values()] as T[];
    },
    async get<T>(store: StoreName, id: string) {
      return data[store].get(id) as T | undefined;
    },
    async put<T extends { id: string }>(store: StoreName, value: T) {
      const checked = guard(value);
      if (checked.ok) data[store].set(value.id, value);
      return checked;
    },
    async remove(store: StoreName, id: string) {
      data[store].delete(id);
    },
    async clear() {
      for (const store of STORES) data[store].clear();
    },
  };
}

/** IndexedDB if this browser has it, memory if not. */
export async function openStore(): Promise<RecordStore> {
  try {
    if (typeof indexedDB === "undefined") return memoryStore();
    return await openIdbStore();
  } catch {
    return memoryStore();
  }
}
