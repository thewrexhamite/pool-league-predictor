import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for debouncing settings slider writes to Firestore.
 * Returns a local value for display and a setter that debounces the save callback.
 */
export function useDebouncedSetting<T>(
  serverValue: T,
  onSave: (value: T) => void,
  delay = 500
): [T, (value: T) => void] {
  const [localValue, setLocalValue] = useState(serverValue);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync from server when it changes (e.g., from another device)
  useEffect(() => {
    setLocalValue(serverValue);
  }, [serverValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const setValue = useCallback(
    (value: T) => {
      setLocalValue(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSave(value), delay);
    },
    [onSave, delay]
  );

  return [localValue, setValue];
}
