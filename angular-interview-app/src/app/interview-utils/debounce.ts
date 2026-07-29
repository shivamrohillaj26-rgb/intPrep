export type DebouncedFunction<T extends (...args: any[]) => void> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void;
  flush: () => void;
};

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
): DebouncedFunction<T> {
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let latestArgs: Parameters<T> | undefined;

  const debounced = ((...args: Parameters<T>) => {
    latestArgs = args;

    if (timerId !== undefined) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      timerId = undefined;
      if (latestArgs) {
        fn(...latestArgs);
      }
    }, delay);
  }) as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    timerId = undefined;
    latestArgs = undefined;
  };

  debounced.flush = () => {
    if (timerId !== undefined && latestArgs) {
      clearTimeout(timerId);
      timerId = undefined;
      fn(...latestArgs);
    }
  };

  return debounced;
}
