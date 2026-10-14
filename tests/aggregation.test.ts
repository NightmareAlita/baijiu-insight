import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateBrandReport, type BrandFetchers } from '../server/services/aggregation.ts';
import { buildScrapeResult, PLATFORMS, publicSearchUrl, safePublicUrl, unavailableResult } from '../server/common.ts';
import { parseBaiduSearch } from '../server/scrapers/baiduSearch.ts';
import { parseBaiduNews } from '../server/scrapers/baiduNews.ts';
import { parseDouyin } from '../server/scrapers/douyin.ts';
import { parseXiaohongshu } from '../server/scrapers/xiaohongshu.ts';
import { parseZhihu } from '../server/scrapers/zhihu.ts';
import { parseWeibo } from '../server/scrapers/weibo.ts';
import type { NewsItem, PlatformId, ScrapeResult } from '../server/types.ts';

const NOW = '2026-10-14T04:00:00.000Z';
const fixedNow = () => new Date(NOW);
const brand = '测试酒';

function fixtureFetchers(overrides: Partial<BrandFetchers> = {}): BrandFetchers {
  return Object.fromEntries(PLATFORMS.map(({ id }) => [id, overrides[id] || (async (name: string) =>
    unavailableResult(publicSearchUrl(id, name), '未提供公开结果'))])) as BrandFetchers;
}

function article(index: number, tone: string): NewsItem {
  return {
    title: brand + ' ' + tone, summary: '', source: '公开测试页面',
    url: 'https://example.com/article/' + index,
    publishedAt: null, capturedAt: NOW, sentiment: 'neutral',
  };
}

function result(id: PlatformId, news: NewsItem[], volume: number | null = null): ScrapeResult {
  return buildScrapeResult(publicSearchUrl(id, brand), news, [], volume);
}

test('全平台无数据时不生成任何虚构指标、报道、热词或历史', async () => {
  const report = await aggregateBrandReport('  ' + brand + '  ', fixtureFetchers(), fixedNow);
  assert.equal(report.brand, brand);
  assert.equal(report.queriedAt, NOW);
  assert.equal(report.status, 'unavailable');
  assert.equal(report.sampleCount, 0);
  assert.equal(report.availablePlatforms, 0);
  assert.equal(report.overallRank, null);
  assert.equal(report.overallHeat, null);
  assert.equal(report.overallReputation, null);
  assert.equal(report.overallSentiment, null);
  assert.deepEqual(report.overallTrend, []);
  assert.deepEqual(report.reputationDimensions, []);
  assert.deepEqual(report.allHotWords, []);
  for (const platform of report.platforms) {
    assert.equal(platform.dataSource, 'unavailable');
    assert.equal(platform.rank, null);
    assert.equal(platform.heatIndex, null);
    assert.equal(platform.volume, null);
    assert.equal(platform.reputation, null);
    assert.equal(platform.sentiment, null);
    assert.equal(platform.sampleCount, 0);
    assert.deepEqual(platform.trend, []);
    assert.deepEqual(platform.news, []);
    assert.deepEqual(platform.hotWords, []);
    assert.ok(platform.sourceUrl.startsWith('https://'));
  }
});

test('单源抛错时保留其余来源，错误不破坏整个报告', async () => {
  const fetchers = fixtureFetchers({
    baidu: async () => result('baidu', [article(1, '好评')]),
    weibo: () => { throw new Error('网络不可用'); },
  });
  const report = await aggregateBrandReport(brand, fetchers, fixedNow);
  assert.equal(report.status, 'partial');
  assert.equal(report.availablePlatforms, 1);
  assert.equal(report.sampleCount, 1);
  assert.equal(report.platforms[0].status, 'error');
  assert.match(report.platforms[0].sourceUrl, /s\.weibo\.com/);
  assert.equal(report.platforms[1].news.length, 1);
});

test('上游返回畸形数据时按来源隔离', async () => {
  const report = await aggregateBrandReport(brand, fixtureFetchers({
    weibo: async () => undefined as unknown as ScrapeResult,
    baidu: async () => result('baidu', [], 42),
  }), fixedNow);
  assert.equal(report.platforms[0].status, 'error');
  assert.match(report.platforms[0].statusMessage, /格式异常/);
  assert.equal(report.platforms[1].volume, 42);
});

test('综合样本分数按实际条目汇总，不能平均平台百分比', async () => {
  const report = await aggregateBrandReport(brand, fixtureFetchers({
    baidu: async () => result('baidu', [article(1, '好评')], 123456),
    news: async () => result('news', [article(2, '投诉'), article(3, '造假'), article(4, '处罚')]),
  }), fixedNow);
  assert.equal(report.sampleCount, 4);
  assert.equal(report.overallReputation, 25);
  assert.equal(report.overallSentiment, 'negative');
  assert.equal(report.platforms[1].reputation, 100);
  assert.equal(report.platforms[5].reputation, 0);
  assert.equal(report.platforms[1].volume, 123456);
  assert.equal(report.platforms[1].sampleCount, 1);
  assert.equal(report.platforms[5].volume, null);
  assert.equal(report.overallHeat, null);
  assert.equal(report.overallRank, null);
  assert.match(report.methodology, /跨平台/);
});

test('样本百分比分配合计100，来源内按永久链接去重', async () => {
  const duplicate = { ...article(1, '好评'), title: brand + ' 新标题好评' };
  const report = await aggregateBrandReport(brand, fixtureFetchers({
    baidu: async () => result('baidu', [article(1, '好评'), duplicate, article(2, '资讯'), article(3, '投诉')]),
  }), fixedNow);
  const platform = report.platforms[1];
  assert.equal(platform.sampleCount, 3);
  const sentiment = platform.sentiment!;
  assert.equal(Math.round((sentiment.positive + sentiment.neutral + sentiment.negative) * 10), 1000);
  assert.equal(platform.reputation, 50);
});

test('明示零搜索结果仍保留0；不产生样本情感', async () => {
  const report = await aggregateBrandReport(brand, fixtureFetchers({
    baidu: async () => result('baidu', [], 0),
  }), fixedNow);
  assert.equal(report.status, 'partial');
  assert.equal(report.platforms[1].volume, 0);
  assert.equal(report.platforms[1].volumeType, 'search-results');
  assert.equal(report.platforms[1].sampleCount, 0);
  assert.equal(report.overallReputation, null);
  assert.equal(report.overallSentiment, null);
});

test('综合倾向保留中性多数，少量正负样本不能覆盖中性样本', async () => {
  const report = await aggregateBrandReport(brand, fixtureFetchers({
    baidu: async () => result('baidu', [article(1, '好评'), article(2, '资讯'), article(3, '新品')]),
  }), fixedNow);
  assert.equal(report.overallSentiment, 'neutral');
});

test('无关内容和危险链接不会进入报告；词条必须和品牌有关', async () => {
  const unsafe = { ...article(1, '好评'), url: 'javascript:alert(1)' };
  const irrelevant = { ...article(2, '好评'), title: '其他品牌好评' };
  const raw = result('baidu', [unsafe, irrelevant]);
  raw.hotWords = [{ name: '通用白酒', value: 99 }, { name: brand + '价格', value: 2 }];
  const report = await aggregateBrandReport(brand, fixtureFetchers({ baidu: async () => raw }), fixedNow);
  assert.equal(report.sampleCount, 0);
  assert.deepEqual(report.allHotWords, [{ name: brand + '价格', value: 2 }]);
});

test('所有来源提供数据时报告完整且保留查询时间', async () => {
  const fetchers = fixtureFetchers(Object.fromEntries(PLATFORMS.map(({ id }, index) =>
    [id, async () => result(id, [article(index, '资讯')])])) as BrandFetchers);
  const report = await aggregateBrandReport(brand, fetchers, fixedNow);
  assert.equal(report.status, 'available');
  assert.equal(report.availablePlatforms, 6);
  assert.equal(report.sampleCount, 6);
  assert.equal(report.overallReputation, 50);
});

test('空品牌、超长品牌、控制字符拒绝；50个Unicode码点允许', async () => {
  await assert.rejects(aggregateBrandReport(' ', fixtureFetchers()), /品牌名称/);
  await assert.rejects(aggregateBrandReport('酒'.repeat(51), fixtureFetchers()), /50/);
  await assert.rejects(aggregateBrandReport('酒\n品牌', fixtureFetchers()), /控制字符/);
  const report = await aggregateBrandReport('🍶'.repeat(50), fixtureFetchers(), fixedNow);
  assert.equal([...report.brand].length, 50);
});

test('百度解析区分公开结果数、采集条数、词条频数及未知发布时间', () => {
  const html = '<html><body><div class="nums">百度为您找到相关结果约 12,345 个</div>' +
    '<div class="result c-container"><h3><a href="https://example.com/article/1">测试酒相关新闻</a></h3><div class="c-abstract">测试酒好评</div></div>' +
    '<div class="result c-container"><h3><a href="https://example.com/other">别家品牌</a></h3></div>' +
    '<div id="rs"><a>测试酒价格</a><a>测试酒价格</a><a>其他品牌</a></div></body></html>';
  const parsed = parseBaiduSearch(html, brand, NOW);
  assert.equal(parsed.volume, 12345);
  assert.equal(parsed.news.length, 1);
  assert.equal(parsed.news[0].publishedAt, null);
  assert.equal(parsed.news[0].capturedAt, NOW);
  assert.deepEqual(parsed.hotWords, [{ name: '测试酒价格', value: 2 }]);
  assert.match(parsed.volumeLabel, /非搜索次数/);
});

test('百度新闻/知乎不能以样本条数随机放大声量', () => {
  const news = parseBaiduNews('<div class="result"><h3><a href="https://example.com/news">测试酒增长</a></h3><span class="news-source">来源媒体 2026-10-13</span></div>', brand, NOW);
  assert.equal(news.news.length, 1);
  assert.equal(news.news[0].publishedAt, '2026-10-13');
  assert.equal(news.volume, null);
  const zhihu = parseZhihu('<div class="SearchResult-Card"><h2 class="ContentItem-title"><a href="https://www.zhihu.com/question/123">测试酒口感如何？</a></h2></div>', brand, NOW);
  assert.equal(zhihu.news.length, 1);
  assert.equal(zhihu.volume, null);
  assert.equal(zhihu.news[0].publishedAt, null);
});

test('动态社交页面没有永久链接时不把标题/界面文字作为真实报道', () => {
  const html = '<div class="title">测试酒 用户好评</div><div class="note">测试酒</div>';
  assert.equal(parseDouyin(html, brand, NOW).status, 'unavailable');
  assert.equal(parseXiaohongshu(html, brand, NOW).status, 'unavailable');
  const video = parseDouyin('<a href="/video/12345" title="测试酒测评"></a><a href="https://evil.example/video/1234" title="测试酒"></a>', brand, NOW);
  assert.equal(video.news.length, 1);
  assert.match(video.news[0].url, /douyin\.com\/video\/12345/);
});

test('微博只收录可追溯帖子，发布时间保留原页面文本', () => {
  const parsed = parseWeibo('<div class="card-wrap"><div class="txt">测试酒收到消费者好评</div><div class="name">酒友</div><div class="from"><a href="https://weibo.com/123/AbCd">2小时前</a></div></div>', brand, NOW);
  assert.equal(parsed.news.length, 1);
  assert.equal(parsed.news[0].publishedAt, '2小时前');
  assert.equal(parsed.volume, null);
});

test('验证码、登录墙和明确无结果提供不同原因', () => {
  assert.match(parseBaiduSearch('<title>百度安全验证</title><body>请输入验证码</body>', brand).statusMessage, /验证码/);
  assert.match(parseDouyin('<title>请登录</title>', brand).statusMessage, /登录/);
  assert.match(parseXiaohongshu('<body>未找到相关结果</body>', brand).statusMessage, /未找到/);
});

test('来源URL拒绝脚本协议、凭据、本机与内网，支持真实相对链接', () => {
  for (const value of ['#', 'javascript:alert(1)', 'data:text/html,x', 'https://user:secret@example.com', 'http://127.0.0.1', 'http://10.1.2.3', 'http://[::1]']) {
    assert.equal(safePublicUrl(value), null);
  }
  assert.equal(safePublicUrl('/video/123', 'https://www.douyin.com'), 'https://www.douyin.com/video/123');
});
