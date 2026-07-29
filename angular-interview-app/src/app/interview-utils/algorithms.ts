export type Interval = [number, number];

export function lengthOfLongestSubstring(value: string): number {
  const lastSeen = new Map<string, number>();
  let left = 0;
  let best = 0;

  for (let right = 0; right < value.length; right++) {
    const char = value[right];
    const previousIndex = lastSeen.get(char);

    if (previousIndex !== undefined && previousIndex >= left) {
      left = previousIndex + 1;
    }

    lastSeen.set(char, right);
    best = Math.max(best, right - left + 1);
  }

  return best;
}

export class IntervalStream {
  private intervals: Interval[] = [];

  add(interval: Interval): Interval[] {
    const result: Interval[] = [];
    let [start, end] = interval;
    let inserted = false;

    if (start > end) {
      [start, end] = [end, start];
    }

    for (const [currentStart, currentEnd] of this.intervals) {
      if (currentEnd < start) {
        result.push([currentStart, currentEnd]);
      } else if (end < currentStart) {
        if (!inserted) {
          result.push([start, end]);
          inserted = true;
        }
        result.push([currentStart, currentEnd]);
      } else {
        start = Math.min(start, currentStart);
        end = Math.max(end, currentEnd);
      }
    }

    if (!inserted) {
      result.push([start, end]);
    }

    this.intervals = result;
    return this.getIntervals();
  }

  getIntervals(): Interval[] {
    return this.intervals.map(([start, end]) => [start, end]);
  }

  clear(): void {
    this.intervals = [];
  }
}
