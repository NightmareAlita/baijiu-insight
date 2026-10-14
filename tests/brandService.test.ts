import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { queryBrand } from '../src/services/brandService';
import { formatTimestamp, safeSourceUrl } from '../src/utils/display';
import type { BrandReport } from '../src/types';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const emptyReport: BrandReport = {
  brand: '茅台', queriedAt: '2026-10-14T04:00:00.000Z',
  overallRank: null, overallHeat: null, overallReputation: null, overallSentiment: null,
  status: 'unavailable', sampleCount: 0, availablePlatforms: 0, methodology: '公开样本，未采集指标为 null。',
  platforms: [{
    platform: { id: 'news', name: '新闻媒体', icon: '闻', color: '#8c4e24', description: '公开报道' },
    rank: null, heatIndex: null, volume: null, sentiment: null, reputation: null,
    trend: [], news: [], hotWords: [], dataSource: 'unavailable', status: 'unavailable',
    statusMessage: '未采集到样本', sampleCount: 0, volumeLabel: '公开搜索结果数', volumeType: null,
    sourceUrl: 'https://example.com/search', metricNotes: '指标待采集',
  }],
  reputationDimensions: [], overallTrend: [], allHotWords: [],
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

function waitForAbort(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
}

test('查询去除首尾空格、编码中文路径，保留缺失指标为 null', async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(input, `/api/brand/${encodeURIComponent('茅台')}`);
    assert.equal(new Headers(init?.headers).get('Accept'), 'application/json');
    assert.ok(init?.signal instanceof AbortSignal);
    return jsonResponse(emptyReport);
  };
  const report = await queryBrand(' 茅台 ');
  assert.equal(report.overallReputation, null);
  assert.equal(report.platforms[0].sentiment, null);
});

test('空品牌和过长品牌不会发出请求', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return jsonResponse(emptyReport); };
  await assert.rejects(queryBrand('   '), /请输入品牌名称/);
  await assert.rejects(queryBrand('酒'.repeat(51)), /50/);
  assert.equal(calls, 0);
});

test('HTTP 错误展示服务端原因，非 JSON 错误仍包含 HTTP 状态', async () => {
  globalThis.fetch = async () => jsonResponse({ error: '品牌名称无效' }, 400);
  await assert.rejects(queryBrand('茅台'), /品牌名称无效/);
  globalThis.fetch = async () => new Response('<html>Bad gateway</html>', { status: 502 });
  await assert.rejects(queryBrand('茅台'), /HTTP 502/);
});

test('成功状态但返回 HTML 或缺失嵌套字段时拒绝，避免页面崩溃', async () => {
  globalThis.fetch = async () => new Response('<html>App shell</html>');
  await assert.rejects(queryBrand('茅台'), /数据格式异常/);
  globalThis.fetch = async () => jsonResponse({ ...emptyReport, platforms: [{ ...emptyReport.platforms[0], news: [{ title: '缺失情感等字段' }] }] });
  await assert.rejects(queryBrand('茅台'), /数据格式异常/);
  globalThis.fetch = async () => jsonResponse({ ...emptyReport, overallSentiment: 'unknown' });
  await assert.rejects(queryBrand('茅台'), /数据格式异常/);
});

test('网络连接失败转换为可理解的错误信息', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(queryBrand('茅台'), /无法连接查询服务/);
});

test('达到请求时限主动中止请求并提示重试', async () => {
  globalThis.fetch = waitForAbort;
  await assert.rejects(queryBrand('茅台', { timeoutMs: 10 }), /查询超时/);
});

test('调用方中止保持 AbortError，已中止的请求不会发送', async () => {
  const controller = new AbortController();
  globalThis.fetch = waitForAbort;
  const pending = queryBrand('茅台', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (error: Error) => error.name === 'AbortError');
  let calls = 0;
  globalThis.fetch = async () => { calls++; return jsonResponse(emptyReport); };
  await assert.rejects(queryBrand('茅台', { signal: controller.signal }), (error: Error) => error.name === 'AbortError');
  assert.equal(calls, 0);
});

test('中止后才返回的响应不会被服务当作成功结果', async () => {
  const controller = new AbortController();
  globalThis.fetch = async () => {
    controller.abort();
    return jsonResponse(emptyReport);
  };
  await assert.rejects(queryBrand('茅台', { signal: controller.signal }), (error: Error) => error.name === 'AbortError');
});

test('报道链接只接受无凭证的绝对 HTTP(S) 地址', () => {
  assert.equal(safeSourceUrl('https://example.com/news?id=1'), 'https://example.com/news?id=1');
  assert.equal(safeSourceUrl('http://example.com/news'), 'http://example.com/news');
  for (const value of ['javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/a', '//example.com', '/article/1', 'https://user:secret@example.com']) {
    assert.equal(safeSourceUrl(value), null);
  }
});

test('日级发布时间不补造时分，完整时间按北京时间显示，来源相对时间保留', () => {
  assert.equal(formatTimestamp('2026-10-14'), '2026-10-14');
  assert.equal(formatTimestamp('2026/10/14'), '2026/10/14');
  assert.equal(formatTimestamp('2小时前'), '2小时前');
  assert.equal(formatTimestamp(null), '未提供');
  assert.equal(formatTimestamp('2026-10-14T04:00:00.000Z'), '2026/10/14 12:00');
});
