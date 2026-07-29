export function deepClone<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (seen.has(value)) {
    return seen.get(value) as T;
  }

  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);

    for (const item of value) {
      copy.push(deepClone(item, seen));
    }

    return copy as T;
  }

  const copy: Record<PropertyKey, unknown> = {};
  seen.set(value, copy);

  for (const key of Reflect.ownKeys(value)) {
    copy[key] = deepClone((value as Record<PropertyKey, unknown>)[key], seen);
  }

  return copy as T;
}
