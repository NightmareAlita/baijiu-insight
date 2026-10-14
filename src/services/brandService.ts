import type { BrandReport, Sentiment } from '../types';

export interface QueryOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

// 只展示服务端返回的公开样本；未采集到的数据由服务端标为不可用。
export async function queryBrand(brand: string, options: QueryOptions = {}): Promise<BrandReport> {
  const cleaned = brand.trim();
  if (!cleaned) throw new Error('请输入品牌名称');
  if ([...cleaned].length > 50) throw new Error('品牌名称不能超过 50 个字符');
  if (options.signal?.aborted) throw new DOMException('查询已取消', 'AbortError');

  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? 45_000);

  try {
    const res = await fetch(`/api/brand/${encodeURIComponent(cleaned)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `查询失败（HTTP ${res.status}）`;
      throw new Error(message);
    }
    if (!isBrandReport(body)) throw new Error('服务返回的数据格式异常，请重试');
    if (controller.signal.aborted) throw new DOMException('查询已取消', 'AbortError');
    return body;
  } catch (error) {
    if (timedOut) throw new Error('查询超时，请稍后重试');
    if (controller.signal.aborted) throw new DOMException('查询已取消', 'AbortError');
    if (error instanceof TypeError) throw new Error('无法连接查询服务，请检查网络或重试');
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

function isBrandReport(body: unknown): body is BrandReport {
  if (!isRecord(body)) return false;
  const report = body;
  return typeof report.brand === 'string'
    && typeof report.queriedAt === 'string'
    && isMetric(report.overallRank)
    && isMetric(report.overallHeat)
    && isMetric(report.overallReputation)
    && (report.overallSentiment === null || isSentiment(report.overallSentiment))
    && ['available', 'partial', 'unavailable'].includes(String(report.status))
    && isCount(report.sampleCount)
    && isCount(report.availablePlatforms)
    && typeof report.methodology === 'string'
    && Array.isArray(report.platforms)
    && report.platforms.every((platform: unknown) => {
      if (!isRecord(platform) || !isRecord(platform.platform)) return false;
      const info = platform.platform;
      return typeof info.id === 'string' && typeof info.name === 'string'
        && typeof info.color === 'string' && typeof info.icon === 'string'
        && isMetric(platform.rank) && isMetric(platform.heatIndex)
        && isMetric(platform.volume) && isMetric(platform.reputation)
        && ['available', 'unavailable', 'error'].includes(String(platform.status))
        && ['real', 'unavailable'].includes(String(platform.dataSource))
        && typeof platform.statusMessage === 'string' && typeof platform.metricNotes === 'string'
        && typeof platform.sourceUrl === 'string' && typeof platform.volumeLabel === 'string'
        && isCount(platform.sampleCount)
        && (platform.sentiment === null || (isRecord(platform.sentiment)
          && ['positive', 'neutral', 'negative'].every((label) => {
            const value = (platform.sentiment as Record<string, unknown>)[label];
            return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
          })))
        && Array.isArray(platform.news) && platform.news.every((item: unknown) => isRecord(item)
          && typeof item.title === 'string' && typeof item.source === 'string'
          && typeof item.url === 'string' && typeof item.summary === 'string'
          && (item.publishedAt === null || typeof item.publishedAt === 'string')
          && typeof item.capturedAt === 'string' && isSentiment(item.sentiment))
        && isWords(platform.hotWords) && isTrend(platform.trend);
    })
    && isTrend(report.overallTrend)
    && Array.isArray(report.reputationDimensions)
    && report.reputationDimensions.every((dimension: unknown) => isRecord(dimension)
      && typeof dimension.name === 'string' && typeof dimension.value === 'number' && isMetric(dimension.value))
    && isWords(report.allHotWords);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isMetric(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

function isCount(value: unknown): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isSentiment(value: unknown): value is Sentiment {
  return typeof value === 'string' && ['positive', 'neutral', 'negative'].includes(value);
}

function isWords(value: unknown): boolean {
  return Array.isArray(value) && value.every((word: unknown) => isRecord(word)
    && typeof word.name === 'string' && typeof word.value === 'number' && isMetric(word.value));
}

function isTrend(value: unknown): boolean {
  return Array.isArray(value) && value.every((point: unknown) => isRecord(point)
    && typeof point.date === 'string' && typeof point.value === 'number' && isMetric(point.value));
}

// 热门品牌建议（搜索下拉）
export const SUGGESTED_BRANDS = [
  '茅台',
  '五粮液',
  '泸州老窖',
  '剑南春',
  '汾酒',
  '洋河',
  '古井贡酒',
  '水井坊',
  '郎酒',
  '习酒',
  '今世缘',
  '舍得',
];
