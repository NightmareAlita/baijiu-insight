import assert from 'node:assert/strict';
import test from 'node:test';
import { createReportStore, normalizeBrand, QueryBusyError } from '../server/services/reportStore.ts';
import type { BrandReport } from '../server/types.ts';

const report = (brand = '茅台', status = 'available') => ({ brand, status }) as BrandReport;

test('brand validation trims and rejects blank, oversized and control characters', () => {
  assert.equal(normalizeBrand('  茅台  '), '茅台');
  for (const value of [' ', '酒'.repeat(51), '茅\u0000台']) assert.throws(() => normalizeBrand(value));
  assert.equal(normalizeBrand('🍷'.repeat(50)).length, 100);
});

test('duplicate queries share work and successful reports expire', async () => {
  let calls = 0;
  let now = 0;
  let resolve!: (data: BrandReport) => void;
  const store = createReportStore(async () => {
    calls++;
    return new Promise<BrandReport>((done) => { resolve = done; });
  }, { now: () => now, ttlMs: 100 });
  const first = store.get('茅台');
  const second = store.get(' 茅台 ');
  await Promise.resolve();
  assert.equal(calls, 1);
  resolve(report());
  assert.equal((await first).cache, 'miss');
  assert.equal((await second).cache, 'shared');
  assert.equal((await store.get('茅台')).cache, 'hit');
  now = 100;
  const next = store.get('茅台');
  await Promise.resolve();
  resolve(report());
  assert.equal((await next).cache, 'miss');
  assert.equal(calls, 2);
});

test('failed requests release concurrency and can be retried', async () => {
  let calls = 0;
  const store = createReportStore(async () => {
    calls++;
    if (calls === 1) throw new Error('offline');
    return report();
  }, { maxConcurrent: 1 });
  await assert.rejects(store.get('茅台'), /offline/);
  assert.equal((await store.get('茅台')).cache, 'miss');
});

test('distinct queries are bounded while duplicates can still join', async () => {
  let resolve!: (data: BrandReport) => void;
  const store = createReportStore(() => new Promise<BrandReport>((done) => { resolve = done; }), { maxConcurrent: 1 });
  const active = store.get('茅台');
  const shared = store.get('茅台');
  await assert.rejects(store.get('五粮液'), QueryBusyError);
  resolve(report());
  await active;
  assert.equal((await shared).cache, 'shared');
});

test('unavailable reports expire after 30 seconds and cache stays bounded', async () => {
  let now = 0;
  const store = createReportStore(async (brand) => report(brand, 'unavailable'), { now: () => now, maxEntries: 1 });
  await store.get('茅台');
  assert.equal((await store.get('茅台')).cache, 'hit');
  now = 30_000;
  assert.equal((await store.get('茅台')).cache, 'miss');
  await store.get('五粮液');
  assert.equal((await store.get('茅台')).cache, 'miss');
});
