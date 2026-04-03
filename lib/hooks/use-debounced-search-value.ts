import { useEffect, useRef, useState } from "react";

const DEFAULT_MS = 350;

/**
 * Debounces a search string before attaching to API query params.
 * When the user deletes characters (trimmed length decreases), updates immediately
 * so lists can widen without waiting for the timer.
 */
export function useDebouncedSearchValue(value: string, delayMs = DEFAULT_MS): string {
  const [debounced, setDebounced] = useState(value);
  const prevTrimLenRef = useRef(value.trim().length);

  useEffect(() => {
    const curLen = value.trim().length;
    const prevLen = prevTrimLenRef.current;
    prevTrimLenRef.current = curLen;

    if (curLen < prevLen) {
      setDebounced(value);
      return;
    }

    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
