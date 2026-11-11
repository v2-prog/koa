/**
 * The small things a person writes: the ledger, the packs, the rings and the
 * minutes. They live in this browser's localStorage and nowhere else.
 *
 * This is the only module that writes to localStorage, and every write is
 * checked by the identifier guard first. The rules check enforces both.
 */
import { deepRefusal } from "./guards.ts";

export const PREFIX = "koa:";

export type WriteResult = { ok: true } | { ok: false; reason: string };

type Listener = () => void;

/** The part of the Storage interface koa uses. */
export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<Listener>>();
let injected: StorageLike | null | undefined;

/** Tests pass their own storage. Passing `undefined` goes back to the browser's. */
export function setStorage(next: StorageLike | null | undefined): void {
  injected = next;
  cache.clear();
}

function storage(): StorageLike | null {
  if (injected !== undefined) return injected;
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function emit(key: string): void {
  for (const listener of listeners.get(key) ?? []) listener();
}

export function subscribe(key: string, listener: Listener): () => void {
  const set = listeners.get(key) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(key, set);
  return () => set.delete(listener);
}

/** What is stored under a key, parsed, or null. */
export function readRaw(key: string): unknown {
  try {
    const raw = storage()?.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

/**
 * The current value for a key. `revive` turns whatever is stored (possibly
 * nothing, possibly an older shape) into a value the screens can trust.
 */
export function snapshot<T>(key: string, revive: (stored: unknown) => T): T {
  if (!cache.has(key)) cache.set(key, revive(readRaw(key)));
  return cache.get(key) as T;
}

/** Saves a value, unless something in it looks like an identifier. */
export function write<T>(key: string, value: T): WriteResult {
  const refusal = deepRefusal(value);
  if (refusal) return { ok: false, reason: refusal };
  try {
    storage()?.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    return {
      ok: false,
      reason: "This browser would not save. Its storage may be full or switched off.",
    };
  }
  cache.set(key, value);
  emit(key);
  return { ok: true };
}

export function remove(key: string): void {
  try {
    storage()?.removeItem(PREFIX + key);
  } catch {
    // Nothing to remove.
  }
  cache.delete(key);
  emit(key);
}

/** Every key koa has written, without the prefix. */
export function storedKeys(): string[] {
  const store = storage();
  if (!store) return [];
  const keys: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (key?.startsWith(PREFIX)) keys.push(key.slice(PREFIX.length));
  }
  return keys.sort();
}

/** Removes everything koa has written to localStorage. */
export function removeAll(): void {
  const keys = new Set([...storedKeys(), ...cache.keys()]);
  for (const key of keys) remove(key);
}

/** Every stored value, for the copy a person saves themselves. */
export function readAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of storedKeys()) out[key] = readRaw(key);
  return out;
}

/** Another tab changed a value: drop the cached copy and tell this tab. */
export function noteExternalChange(fullKey: string | null): void {
  const keys = fullKey === null ? [...cache.keys()] : fullKey.startsWith(PREFIX) ? [fullKey.slice(PREFIX.length)] : [];
  for (const key of keys) {
    cache.delete(key);
    emit(key);
  }
}
