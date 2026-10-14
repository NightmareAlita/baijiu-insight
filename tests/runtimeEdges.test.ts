import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { createLocalServer } from '../electron/local-server.js';
import { createApp } from '../server/index.ts';
import { createReportStore } from '../server/services/reportStore.ts';
import type { BrandReport } from '../server/types.ts';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

const report = (brand: string) => ({ brand, status: 'unavailable' }) as BrandReport;

async function startApi(query: (brand: string) => Promise<BrandReport>) {
  const server = createApp(query).listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

async function closeApi(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
}

function fetchBrand(base: string, brand: string) {
  return fetch(`${base}/api/brand/${encodeURIComponent(brand)}`, { signal: AbortSignal.timeout(3_000) });
}

// Every HTTP test injects its query implementation and only contacts loopback.
test('query rejection returns a safe JSON 500 response', async (context) => {
  context.mock.method(console, 'error', () => {});
  const { server, base } = await startApi(async () => {
    throw new Error('private provider diagnostic');
  });
  try {
    const response = await fetchBrand(base, '茅台');
    assert.equal(response.status, 500);
    assert.match(response.headers.get('content-type') ?? '', /application\/json/);
    assert.deepEqual(await response.json(), { error: '查询服务暂时不可用，请稍后重试' });
  } finally {
    await closeApi(server);
  }
});

test('eight pending brands reject the ninth with 503 and Retry-After', async () => {
  const allStarted = deferred<void>();
  const release = deferred<void>();
  let calls = 0;
  const { server, base } = await startApi(async (brand) => {
    if (++calls === 8) allStarted.resolve(undefined);
    await release.promise;
    return report(brand);
  });
  const responses = Promise.allSettled(Array.from({ length: 8 }, (_, index) => fetchBrand(base, `测试品牌${index}`)));
  try {
    const deadline = setTimeout(() => allStarted.reject(new Error('pending queries did not start')), 3_000);
    try {
      await allStarted.promise;
    } finally {
      clearTimeout(deadline);
    }
    const response = await fetchBrand(base, '第九个品牌');
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('retry-after'), '10');
    assert.deepEqual(await response.json(), { error: '当前查询较多，请稍后重试' });
    assert.equal(calls, 8);
    release.resolve(undefined);
    for (const result of await responses) {
      assert.equal(result.status, 'fulfilled');
      if (result.status === 'fulfilled') {
        assert.equal(result.value.status, 200);
        await result.value.json();
      }
    }
  } finally {
    release.resolve(undefined);
    await responses;
    await closeApi(server);
  }
});

test('asynchronous listen failure can be retried', async () => {
  let starts = 0;
  let closes = 0;
  const backend = createLocalServer(async () => ({
    listen: () => {
      const attempt = ++starts;
      const server = Object.assign(new EventEmitter(), {
        address: () => ({ port: 43210 }),
        close: (callback: () => void) => { closes++; callback(); },
      });
      queueMicrotask(() => {
        if (attempt === 1) server.emit('error', new Error('listen failed'));
        else server.emit('listening');
      });
      return server;
    },
  }));
  await assert.rejects(backend.start(), /listen failed/);
  assert.equal(await backend.start(), 'http://127.0.0.1:43210');
  assert.equal(starts, 2);
  await backend.stop();
  assert.equal(closes, 1);
});

test('stop waits for pending startup and closes the resulting server', async () => {
  const listenStarted = deferred<void>();
  let closes = 0;
  let stopped = false;
  const server = Object.assign(new EventEmitter(), {
    address: () => ({ port: 43210 }),
    close: (callback: () => void) => { closes++; callback(); },
  });
  const backend = createLocalServer(async () => ({
    listen: () => { listenStarted.resolve(undefined); return server; },
  }));
  const starting = backend.start();
  await listenStarted.promise;
  const stopping = backend.stop().then(() => { stopped = true; });
  await Promise.resolve();
  assert.equal(stopped, false);
  assert.equal(closes, 0);
  server.emit('listening');
  assert.equal(await starting, 'http://127.0.0.1:43210');
  await stopping;
  assert.equal(stopped, true);
  assert.equal(closes, 1);
  await backend.stop();
  assert.equal(closes, 1);
});

test('all duplicate callers reject together and a later query can retry', async () => {
  const failed = deferred<BrandReport>();
  let calls = 0;
  const store = createReportStore(async (brand) => {
    if (++calls === 1) return failed.promise;
    return report(brand);
  }, { maxConcurrent: 1 });
  const outcomes = Promise.allSettled([store.get('茅台'), store.get(' 茅台 '), store.get('茅台')]);
  await Promise.resolve();
  assert.equal(calls, 1);
  const failure = new Error('provider offline');
  failed.reject(failure);
  for (const result of await outcomes) {
    assert.equal(result.status, 'rejected');
    if (result.status === 'rejected') assert.equal(result.reason, failure);
  }
  const retried = await store.get('茅台');
  assert.equal(retried.cache, 'miss');
  assert.equal(retried.report.brand, '茅台');
  assert.equal(calls, 2);
});
