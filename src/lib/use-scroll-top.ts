import { useEffect } from "react";

/** Goes back to the top of the page when a screen moves to its next step. */
export function useScrollTopOn(step: unknown): void {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);
}
