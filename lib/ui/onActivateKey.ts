import type { KeyboardEvent } from "react";

/**
 * Make a role="button" element keyboard-operable: Enter or Space triggers the
 * same action as a click. Pair with role="button" + tabIndex={0}.
 */
export function onActivateKey(fn: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };
}
