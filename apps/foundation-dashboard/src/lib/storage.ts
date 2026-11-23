/** Safe localStorage JSON helpers: corrupt or missing values never throw. */

export function readJson<T extends object>(key: string): Partial<T> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Partial<T>) : {};
  } catch {
    return {};
  }
}

export function mergeJson<T extends object>(key: string, patch: Partial<T>): Partial<T> {
  const merged = { ...readJson<T>(key), ...patch };
  window.localStorage.setItem(key, JSON.stringify(merged));
  return merged;
}
