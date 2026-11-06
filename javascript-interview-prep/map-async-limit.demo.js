/**
 * mapAsyncLimit — runnable demo
 *
 *   node javascript-interview-prep/map-async-limit.demo.js
 *
 * Watch:
 *   - inFlight never goes above `size`
 *   - results stay in INPUT order even if jobs finish out of order
 *   - one reject fails the whole call (like Promise.all)
 */

async function mapAsyncLimit(iterable, callbackFn, size = Infinity) {
  const items = Array.from(iterable);
  const n = items.length;
  if (n === 0) return [];

  const limit = Math.min(Number.isFinite(size) ? size : n, n);
  if (limit < 1) return [];

  const results = new Array(n);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= n) return;
      results[i] = await callbackFn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function banner(title) {
  console.log('\n' + '='.repeat(56));
  console.log(title);
  console.log('='.repeat(56));
}

// ---------------------------------------------------------------------------
// Demo 1 — fake API: 6 ids, each ~400ms. Compare unlimited vs limit 2 vs 1
// ---------------------------------------------------------------------------
async function demoInFlight() {
  banner('Demo 1: inFlight cap (ids 1..6, each job ~400ms)');

  let inFlight = 0;
  let peak = 0;

  async function fakeFetch(id) {
    inFlight++;
    peak = Math.max(peak, inFlight);
    console.log(`  START ${id}  inFlight=${inFlight}`);
    await sleep(400);
    inFlight--;
    console.log(`  END   ${id}  inFlight=${inFlight}`);
    return `ok-${id}`;
  }

  async function run(label, fn) {
    inFlight = 0;
    peak = 0;
    const t0 = Date.now();
    console.log(`\n--- ${label} ---`);
    const results = await fn();
    console.log(`results:`, results);
    console.log(`peak inFlight=${peak}  wall=${Date.now() - t0}ms`);
  }

  const ids = [1, 2, 3, 4, 5, 6];

  await run('UNLIMITED  Promise.all(ids.map(fakeFetch))', () =>
    Promise.all(ids.map((id) => fakeFetch(id))),
  );

  await run('LIMIT 2    mapAsyncLimit(ids, fakeFetch, 2)', () =>
    mapAsyncLimit(ids, fakeFetch, 2),
  );

  await run('LIMIT 1    mapAsyncLimit(ids, fakeFetch, 1)', () =>
    mapAsyncLimit(ids, fakeFetch, 1),
  );
}

// ---------------------------------------------------------------------------
// Demo 2 — GreatFrontEnd-style: uppercase with delay, size=2
// ---------------------------------------------------------------------------
async function demoUpperCase() {
  banner('Demo 2: mapAsyncLimit(["foo","bar","qux","quz"], fetchUpperCase, 2)');

  async function fetchUpperCase(q) {
    console.log(`  fetching "${q}"...`);
    await sleep(300);
    const out = q.toUpperCase();
    console.log(`  got "${out}"`);
    return out;
  }

  const input = ['foo', 'bar', 'qux', 'quz'];
  const results = await mapAsyncLimit(input, fetchUpperCase, 2);
  console.log('input:  ', input);
  console.log('output: ', results);
  console.log('expect: ', ['FOO', 'BAR', 'QUX', 'QUZ']);
}

// ---------------------------------------------------------------------------
// Demo 3 — mixed durations: slow first item, fast later items
//           proves we write results[i], not results.push
// ---------------------------------------------------------------------------
async function demoOrder() {
  banner('Demo 3: order preserved (slow A, fast B/C/D, limit=2)');

  const jobs = [
    { id: 'A', ms: 800 },
    { id: 'B', ms: 100 },
    { id: 'C', ms: 100 },
    { id: 'D', ms: 100 },
  ];

  const finishOrder = [];

  const results = await mapAsyncLimit(
    jobs,
    async (job) => {
      console.log(`  START ${job.id} (${job.ms}ms)`);
      await sleep(job.ms);
      finishOrder.push(job.id);
      console.log(`  END   ${job.id}`);
      return job.id;
    },
    2,
  );

  console.log('finish order (completion):', finishOrder.join(' → '));
  console.log('results array (input order):', results);
  console.log('expect results:             ', ['A', 'B', 'C', 'D']);
  console.log('(B/C/D finish before A, but results[0] is still A)');
}

// ---------------------------------------------------------------------------
// Demo 4 — one failure rejects the whole call (Promise.all semantics)
// ---------------------------------------------------------------------------
async function demoReject() {
  banner('Demo 4: one reject → whole mapAsyncLimit rejects');

  const urls = ['user/1', 'user/FAIL', 'user/3', 'user/4'];

  try {
    await mapAsyncLimit(
      urls,
      async (url) => {
        console.log(`  GET ${url}`);
        await sleep(150);
        if (url.includes('FAIL')) throw new Error('404 ' + url);
        return { url, ok: true };
      },
      2,
    );
    console.log('unexpected: should have thrown');
  } catch (err) {
    console.log('caught:', err.message);
    console.log('same as Promise.all — fail fast, no partial array returned');
  }
}

async function main() {
  await demoInFlight();
  await demoUpperCase();
  await demoOrder();
  await demoReject();
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
