import { useEffect, useState } from 'react';

/**
 * Current time in ms, refreshed every `intervalMs`. Use for relative times
 * ("5m ago", lock progress) instead of calling Date.now() during render.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
