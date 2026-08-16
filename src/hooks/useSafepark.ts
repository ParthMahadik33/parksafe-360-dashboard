import { useSyncExternalStore, useEffect } from "react";
import { getState, startSafepark, subscribe } from "@/lib/safepark/store";
import type { SafeparkState } from "@/lib/safepark/types";

const serverSnapshot = getState();

/** Subscribe any component to the live SAFEPARK 360 state. */
export function useSafepark(): SafeparkState {
  useEffect(() => {
    startSafepark();
  }, []);
  return useSyncExternalStore(
    (cb) => subscribe(() => cb()),
    getState,
    () => serverSnapshot,
  );
}
