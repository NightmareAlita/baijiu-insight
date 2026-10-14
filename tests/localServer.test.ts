import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { createLocalServer, getExternalUrl } from '../electron/local-server.js';

test('window reopening and simultaneous startup reuse a single backend', async () => {
  let starts = 0;
  let closes = 0;
  let loaded = 0;
  const fakeServer = Object.assign(new EventEmitter(), {
    address: () => ({ port: 43210 }),
    close: (callback: () => void) => { closes++; callback(); },
  });
  const backend = createLocalServer(async () => {
    loaded++;
    return {
      listen: (port: number, host: string) => {
        assert.equal(port, 0);
        assert.equal(host, '127.0.0.1');
        starts++;
        queueMicrotask(() => fakeServer.emit('listening'));
        return fakeServer;
      },
    };
  });
  const results = await Promise.all([backend.start(), backend.start()]);
  assert.deepEqual(results, ['http://127.0.0.1:43210', 'http://127.0.0.1:43210']);
  await backend.start();
  assert.equal(starts, 1);
  assert.equal(loaded, 1);
  await backend.stop();
  await backend.stop();
  assert.equal(closes, 1);
  await backend.start();
  assert.equal(starts, 2);
  await backend.stop();
});

test('startup errors are retryable', async () => {
  let loads = 0;
  const fakeServer = Object.assign(new EventEmitter(), {
    address: () => ({ port: 43210 }),
    close: (callback: () => void) => callback(),
  });
  const backend = createLocalServer(async () => {
    if (++loads === 1) throw new Error('not built');
    return { listen: () => { queueMicrotask(() => fakeServer.emit('listening')); return fakeServer; } };
  });
  await assert.rejects(backend.start(), /not built/);
  assert.equal(await backend.start(), 'http://127.0.0.1:43210');
  await backend.stop();
});

test('external links permit only valid HTTP(S) URLs without credentials', () => {
  assert.equal(getExternalUrl('https://www.baidu.com/s?wd=茅台'), 'https://www.baidu.com/s?wd=%E8%8C%85%E5%8F%B0');
  for (const value of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,test', 'not a url', 'https://user:pass@example.com']) {
    assert.equal(getExternalUrl(value), null);
  }
});
