import { useCallback, useSyncExternalStore } from "react";
import { remove, snapshot, subscribe, write, type WriteResult } from "./local-store.ts";

/**
 * One value on this device, shared by every component that asks for the same
 * key. `revive` must be a stable function (define it at module level).
 */
export function useLocalStore<T>(key: string, revive: (stored: unknown) => T) {
  const state = useSyncExternalStore(
    useCallback((listener: () => void) => subscribe(key, listener), [key]),
    () => snapshot(key, revive),
  );
  const set = useCallback((next: T): WriteResult => write(key, next), [key]);
  const clear = useCallback(() => remove(key), [key]);
  return { state, set, clear };
}
