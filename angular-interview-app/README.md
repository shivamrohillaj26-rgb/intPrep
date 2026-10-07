# Angular Interview App

This folder is a small standalone Angular application for the interview questions in `../Questions1.txt`.

## Run It

```bash
cd angular-interview-app
npm start
```

Then open the local URL shown by Angular.

## What This App Demonstrates

The app intentionally keeps every example small enough to explain in an interview.

1. Debounced search: `src/app/interview-utils/debounce.ts`
2. Infinite scroll/lazy loading: `loadMoreItems()` in `src/app/app.ts`
3. Deep clone with cyclic references: `src/app/interview-utils/deep-clone.ts`
4. Longest substring sliding window: `src/app/interview-utils/algorithms.ts`
5. Controllable scheduler: `src/app/interview-utils/task-scheduler.ts`
6. Autosave using debounce plus interval safety check: `onEditorChange()` and `flushIfInactive()` in `src/app/app.ts`
7. Merge intervals in a stream: `IntervalStream` in `src/app/interview-utils/algorithms.ts`
8. Infinite carousel: `previousSlide()` and `nextSlide()` in `src/app/app.ts`
9. Trie autocomplete: `src/app/interview-utils/trie.ts`

## Angular Interview Talking Points

### Debounced Search

In Angular, input changes can be handled with template events, reactive forms, signals, or RxJS. This demo uses a minimal plain debounce utility so the underlying JavaScript concept is easy to explain. In a production Angular app, RxJS `debounceTime`, `distinctUntilChanged`, and `switchMap` are common because they also handle request cancellation patterns.

### Infinite Scroll

The app demonstrates the important invariant: do not render the entire list. It appends only one small page at a time. For production-scale Angular apps, use Angular CDK virtual scroll when the list is very large.

### Deep Clone

Angular state updates often rely on immutable references. A correct deep clone is useful to understand, but in real apps you should avoid cloning huge state trees frequently. Prefer targeted immutable updates.

### Scheduler

The scheduler wraps browser timers and keeps remaining time when paused. The key interview point is that `setTimeout` alone has no pause/resume API, so we calculate elapsed time manually.

### Autosave

Debounce handles the main requirement: save after inactivity. The interval is used as a safety check against missed saves and can also power status UI. In production, add retry logic and stale response protection.

### Trie Autocomplete

The Trie example is intentionally simple. It collects all matches and sorts by frequency. If asked to optimize, store top K suggestions at every Trie node during insertion.

## How To Explain Complexity

When a UI demo has a fixed page size, be precise. Loading a page of 12 items is `O(12)`, which behaves like constant time in the app, but algorithmically it is `O(k)` where `k` is page size. The important win is that work does not grow with the total list size.
