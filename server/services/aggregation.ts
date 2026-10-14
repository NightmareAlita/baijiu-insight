import { fetchBaiduNews } from '../scrapers/baiduNews.js';
import { fetchBaiduSearch } from '../scrapers/baiduSearch.js';
import { fetchWeibo } from '../scrapers/weibo.js';
import { fetchZhihu } from '../scrapers/zhihu.js';
import { fetchDouyin } from '../scrapers/douyin.js';
import { fetchXiaohongshu } from '../scrapers/xiaohongshu.js';
import { PLATFORMS, buildScrapeResult, isBrandRelevant, makeNewsItem, publicSearchUrl, unavailableResult } from '../common.js';
import type { BrandReport, HotWord, NewsItem, PlatformData, PlatformId, ScrapeResult, SentimentDistribution } from '../types.js';

export type BrandFetcher = (brand: string) => Promise<ScrapeResult>;
export type BrandFetchers = Record<PlatformId, BrandFetcher>;

const DEFAULT_FETCHERS: BrandFetchers = {
  weibo: fetchWeibo, baidu: fetchBaiduSearch, douyin: fetchDouyin,
  xiaohongshu: fetchXiaohongshu, zhihu: fetchZhihu, news: fetchBaiduNews,
};

const METRIC_NOTES = '情感与样本分数来自标题/摘要关键词规则；正面=100、中性=50、负面=0，仅描述采集样本。词条数为公开页面中的出现次数。未取得可信品类排名、热度指数、历史趋势或维度评分。';

function summarizeSamples(news: NewsItem[]): {
  sentiment: SentimentDistribution | null;
  reputation: number | null;
} {
  if (!news.length) return { sentiment: null, reputation: null };
  const counts = {
    positive: news.filter((item) => item.sentiment === 'positive').length,
    neutral: news.filter((item) => item.sentiment === 'neutral').length,
    negative: news.filter((item) => item.sentiment === 'negative').length,
  };
  // 使用最大余数法保留一位小数，保证分布合计 100%。
  const keys = ['positive', 'neutral', 'negative'] as const;
  const exact = keys.map((key) => counts[key] / news.length * 1000);
  const tenths = exact.map(Math.floor);
  const remainderOrder = keys.map((_, index) => index).sort((a, b) => (exact[b] - tenths[b]) - (exact[a] - tenths[a]));
  const missing = 1000 - tenths.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < missing; i++) tenths[remainderOrder[i]]++;
  return {
    sentiment: { positive: tenths[0] / 10, neutral: tenths[1] / 10, negative: tenths[2] / 10 },
    reputation: Math.round((counts.positive * 100 + counts.neutral * 50) / news.length * 10) / 10,
  };
}

function assemblePlatformData(platformIndex: number, result: ScrapeResult, brand: string, capturedAt: string): PlatformData {
  const platform = PLATFORMS[platformIndex];
  const news = result.news.map((item) => makeNewsItem({
    title: item.title, summary: item.summary, source: item.source, url: item.url, publishedAt: item.publishedAt,
  }, brand, result.sourceUrl, item.capturedAt || capturedAt)).filter((item): item is NewsItem => item !== null);
  const words = result.hotWords.filter((word) => isBrandRelevant(word.name, brand) && Number.isSafeInteger(word.value) && word.value > 0);
  const verified = buildScrapeResult(result.sourceUrl, news, words, result.volume);
  const samples = summarizeSamples(verified.news);
  return {
    platform,
    rank: null,
    heatIndex: null,
    volume: verified.volume,
    volumeType: verified.volumeType,
    volumeLabel: verified.volumeLabel,
    sampleCount: verified.news.length,
    ...samples,
    trend: [],
    news: verified.news,
    hotWords: verified.hotWords,
    dataSource: verified.status === 'available' ? 'real' : 'unavailable',
    status: verified.status === 'available' ? 'available' : result.status === 'error' ? 'error' : 'unavailable',
    statusMessage: verified.status === 'available' ? verified.statusMessage : result.statusMessage,
    sourceUrl: result.sourceUrl,
    metricNotes: METRIC_NOTES,
  };
}

// fetchers 和时间可注入，以便离线回归测试；单个平台异常不导致整个报告失败。
export async function aggregateBrandReport(
  brand: string,
  fetchers: BrandFetchers = DEFAULT_FETCHERS,
  now: () => Date = () => new Date(),
): Promise<BrandReport> {
  if (typeof brand !== 'string') throw new Error('品牌名称必须是字符串');
  const cleaned = brand.trim();
  if (!cleaned) throw new Error('请输入品牌名称');
  const invalidCharacter = [...cleaned].some((character) => {
    const code = character.codePointAt(0)!;
    return code < 32 || code === 127;
  });
  if ([...cleaned].length > 50 || invalidCharacter) throw new Error('品牌名称不得超过 50 个字符或包含控制字符');

  const capturedAt = now().toISOString();
  const results = await Promise.allSettled(PLATFORMS.map((platform) => Promise.resolve().then(() => fetchers[platform.id](cleaned))));
  const platforms = results.map((result, index) => {
    const real = result.status === 'fulfilled'
      ? result.value
      : unavailableResult(publicSearchUrl(PLATFORMS[index].id, cleaned), '采集失败，暂无可用数据', 'error');
    try { return assemblePlatformData(index, real, cleaned, capturedAt); }
    catch {
      return assemblePlatformData(index, unavailableResult(publicSearchUrl(PLATFORMS[index].id, cleaned), '平台数据格式异常，暂无可用数据', 'error'), cleaned, capturedAt);
    }
  });

  const allSamples = platforms.flatMap((platform) => platform.news);
  const summary = summarizeSamples(allSamples);
  const positive = allSamples.filter((item) => item.sentiment === 'positive').length;
  const negative = allSamples.filter((item) => item.sentiment === 'negative').length;
  const neutral = allSamples.length - positive - negative;
  const availablePlatforms = platforms.filter((platform) => platform.status === 'available').length;
  const wordMap = new Map<string, number>();
  platforms.forEach((platform) => platform.hotWords.forEach((word) => {
    wordMap.set(word.name, (wordMap.get(word.name) || 0) + word.value);
  }));
  const allHotWords: HotWord[] = [...wordMap].map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value).slice(0, 30);

  return {
    brand: cleaned,
    queriedAt: capturedAt,
    status: availablePlatforms === platforms.length ? 'available' : availablePlatforms > 0 ? 'partial' : 'unavailable',
    sampleCount: allSamples.length,
    availablePlatforms,
    methodology: '仅采集当前公开可访问页面，不代表全网覆盖。综合样本分数按实际采集条目汇总，综合情感取样本中最多的标签，票数相同视为中性；跨平台可能出现同一内容。搜索结果数、样本条数各自展示，不能比较或累加为声量。标题/摘要情感使用简易关键词规则，不能代表真实用户口碑。没有可信历史数据、排名与热度指标时显示未提供。',
    overallRank: null,
    overallHeat: null,
    overallReputation: summary.reputation,
    overallSentiment: allSamples.length ? positive > Math.max(negative, neutral) ? 'positive' : negative > Math.max(positive, neutral) ? 'negative' : 'neutral' : null,
    platforms,
    reputationDimensions: [],
    overallTrend: [],
    allHotWords,
  };
}
