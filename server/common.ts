import axios from 'axios';
import type { CheerioAPI } from 'cheerio';
import type { HotWord, NewsItem, PlatformId, PlatformInfo, ScrapeResult, Sentiment } from './types.js';

export const PLATFORMS: PlatformInfo[] = [
  { id: 'weibo', name: '微博', icon: '微', color: '#E6162D', description: '公开搜索内容' },
  { id: 'baidu', name: '百度', icon: '百', color: '#2932E1', description: '公开搜索结果与相关词条' },
  { id: 'douyin', name: '抖音', color: '#000000', icon: '抖', description: '公开可访问视频' },
  { id: 'xiaohongshu', name: '小红书', icon: '红', color: '#FF2442', description: '公开可访问笔记' },
  { id: 'zhihu', name: '知乎', icon: '知', color: '#0084FF', description: '公开讨论与问答' },
  { id: 'news', name: '新闻媒体', icon: '闻', color: '#8c4e24', description: '公开新闻搜索结果' },
];

export function publicSearchUrl(platform: PlatformId, brand: string): string {
  const query = encodeURIComponent(brand + ' 白酒');
  const urls: Record<PlatformId, string> = {
    weibo: 'https://s.weibo.com/weibo?q=' + encodeURIComponent(brand) + '&typeall=1&suball=1&Refer=g',
    baidu: 'https://www.baidu.com/s?wd=' + query,
    douyin: 'https://www.douyin.com/search/' + query,
    xiaohongshu: 'https://www.xiaohongshu.com/search_result?keyword=' + query,
    zhihu: 'https://www.zhihu.com/search?type=content&q=' + query,
    news: 'https://www.baidu.com/s?tn=news&rtt=4&bsst=1&cl=2&wd=' + query,
  };
  return urls[platform];
}

export const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

// 不使用占位登录 Cookie，也不绕过验证码。限制超时和响应大小。
export async function readPublicPage(url: string, referer?: string): Promise<string> {
  const response = await axios.get(url, {
    headers: { ...BROWSER_HEADERS, ...(referer ? { Referer: referer } : {}) },
    timeout: 8000,
    maxRedirects: 3,
    maxContentLength: 2 * 1024 * 1024,
    maxBodyLength: 2 * 1024 * 1024,
    responseType: 'arraybuffer',
  });
  const contentType = String(response.headers['content-type'] || '');
  if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
    throw new Error('UNSUPPORTED_CONTENT_TYPE');
  }
  return Buffer.from(response.data).toString('utf-8');
}

export function safePublicUrl(value: string | undefined, base?: string): string | null {
  if (!value || value.trim().startsWith('#')) return null;
  try {
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '[::1]' || hostname.endsWith('.local') ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}

export function isBrandRelevant(text: string, brand: string): boolean {
  return text.normalize('NFKC').toLocaleLowerCase().includes(brand.normalize('NFKC').toLocaleLowerCase());
}

export function makeNewsItem(input: {
  title: string; summary: string; source: string; url?: string;
  publishedAt?: string | null;
}, brand: string, baseUrl: string, capturedAt: string): NewsItem | null {
  const title = input.title.replace(/\s+/g, ' ').trim().slice(0, 200);
  const summary = input.summary.replace(/\s+/g, ' ').trim().slice(0, 600);
  const url = safePublicUrl(input.url, baseUrl);
  if (title.length < 3 || !url || !isBrandRelevant(title + ' ' + summary, brand)) return null;
  return {
    title, summary, source: input.source.trim() || '公开页面', url,
    publishedAt: input.publishedAt?.trim() || null,
    capturedAt,
    sentiment: analyzeSentiment(title + ' ' + summary),
  };
}

export function deduplicateNews(news: NewsItem[], limit = 8): NewsItem[] {
  const seen = new Set<string>();
  return news.filter((item) => {
    const key = item.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

export function collectHotWords($: CheerioAPI, selector: string, brand: string): HotWord[] {
  const counts = new Map<string, number>();
  $(selector).each((_, element) => {
    const name = $(element).text().replace(/\s+/g, ' ').trim();
    if (name.length > 1 && name.length < 30 && isBrandRelevant(name, brand)) counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
}

export function unavailableResult(sourceUrl: string, statusMessage: string, status: 'unavailable' | 'error' = 'unavailable'): ScrapeResult {
  return { news: [], hotWords: [], volume: null, volumeType: null, volumeLabel: '公开搜索结果数未提供', sourceUrl, status, statusMessage };
}

export function scrapeError(sourceUrl: string, error: unknown): ScrapeResult {
  const timeout = axios.isAxiosError(error) && ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code || '');
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const message = timeout ? '公开页面请求超时，暂无可用数据'
    : status === 401 ? '平台要求登录，未获得公开数据'
    : status === 403 ? '平台拒绝访问，未获得公开数据'
    : status === 429 ? '平台请求频率受限，请稍后重试'
    : '公开页面请求失败，暂无可用数据';
  return unavailableResult(sourceUrl, message, 'error');
}

export function describeEmptyPage($: CheerioAPI): string {
  const title = $('title').text();
  const text = $('body').text().replace(/\s+/g, ' ').slice(0, 10000);
  if (/验证码|安全验证|访问验证|验证您的身份|验证你是人类/.test(title + ' ' + text)) return '平台要求验证码，未获得公开数据';
  if (/登录|登陆|Sign in/i.test(title) || /登录后(?:查看|搜索)|请先登录|登录后继续/.test(text)) return '平台要求登录，未获得公开数据';
  if (/没有找到|未找到相关|没有相关结果|暂无(?:搜索)?结果|找不到相关结果/.test(text)) return '公开搜索页明确未找到相关结果';
  return '页面未提供可验证的公开内容，可能需要动态渲染或页面结构已变化';
}

export function buildScrapeResult(sourceUrl: string, news: NewsItem[], hotWords: HotWord[] = [], volume: number | null = null, emptyMessage?: string): ScrapeResult {
  const items = deduplicateNews(news);
  const count = volume !== null && Number.isSafeInteger(volume) && volume >= 0 ? volume : null;
  const available = items.length > 0 || hotWords.length > 0 || count !== null;
  return {
    sourceUrl, news: items, hotWords, volume: count,
    volumeType: count !== null ? 'search-results' : null,
    volumeLabel: count !== null ? '页面提供的公开搜索结果数（非搜索次数）' : '公开搜索结果数未提供',
    status: available ? 'available' : 'unavailable',
    statusMessage: available ? '已采集公开页面；仅代表当前可见样本' : emptyMessage || '未获得可验证的公开内容',
  };
}

// 仅解析页面明示的结果数，不以采集条数估算声量。
export function parseResultCount(text: string, mode: 'baidu' | 'weibo'): number | null {
  const pattern = mode === 'baidu'
    ? /(?:找到|搜索到)?相关结果\s*(?:约|大约)?\s*([\d,，]+(?:\.\d+)?)\s*(万|亿)?\s*个/
    : /([\d,，]+(?:\.\d+)?)\s*(万|亿)?\s*条(?:微博|结果)/;
  const match = text.match(pattern);
  if (!match) return null;
  const multiplier = match[2] === '亿' ? 100000000 : match[2] === '万' ? 10000 : 1;
  const value = Number(match[1].replace(/[,，]/g, '')) * multiplier;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

const POSITIVE_WORDS = ['增长', '上涨', '创新高', '领先', '突破', '好评', '热销', '认可', '优质', '第一', '冠军'];
const NEGATIVE_WORDS = ['下跌', '下滑', '投诉', '造假', '问题', '召回', '处罚', '质疑', '争议', '暴跌', '风险', '亏损'];

// 标题/摘要的简易规则标签，仅用于样本描述，不能推断真实用户口碑。
export function analyzeSentiment(text: string): Sentiment {
  const positive = POSITIVE_WORDS.filter((word) => text.includes(word)).length;
  const negative = NEGATIVE_WORDS.filter((word) => text.includes(word)).length;
  return positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral';
}
