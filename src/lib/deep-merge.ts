function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function deepMerge<T>(base: T, updates: Partial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(updates)) {
    return updates as T;
  }

  const merged: Record<string, unknown> = {
    ...(base as Record<string, unknown>)
  };

  Object.entries(updates as Record<string, unknown>).forEach(([key, value]) => {
    const current = merged[key];

    if (Array.isArray(value)) {
      merged[key] = [...value];
      return;
    }

    if (isPlainObject(current) && isPlainObject(value)) {
      merged[key] = deepMerge(current, value);
      return;
    }

    merged[key] = value;
  });

  return merged as T;
}
