import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/index.ts';
import type { BrandReport } from '../server/types.ts';

// Actual HTTP checks use an injected aggregator; no platform requests are sent.
test('API startup, validation, caching and JSON failures over HTTP', async () => {
  let calls = 0;
  const app = createApp(async (brand: string) => {
    calls++;
    return { brand, status: 'unavailable' } as BrandReport;
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, 'ok');
    const first = await fetch(`${base}/api/brand/${encodeURIComponent('茅台')}`);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get('X-Report-Cache'), 'miss');
    assert.equal((await first.json()).brand, '茅台');
    const repeat = await fetch(`${base}/api/brand/${encodeURIComponent(' 茅台 ')}`);
    assert.equal(repeat.headers.get('X-Report-Cache'), 'hit');
    assert.equal(calls, 1);
    for (const value of [' ', '酒'.repeat(51), '茅\u0000台']) {
      const res = await fetch(`${base}/api/brand/${encodeURIComponent(value)}`);
      assert.equal(res.status, 400);
      assert.ok((await res.json()).error);
    }
    const missing = await fetch(`${base}/api/unknown`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error, '接口不存在');
    const malformed = await fetch(`${base}/api/brand/%E0%A4%A`);
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).error, '请求格式错误');
    const page = await fetch(base);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>白酒品牌洞察/);
  } finally {
    await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); });
  }
});
