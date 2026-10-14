import * as cheerio from 'cheerio';
import { buildScrapeResult, collectHotWords, describeEmptyPage, makeNewsItem, readPublicPage, safePublicUrl, scrapeError, unavailableResult } from '../common.js';
import type { NewsItem, ScrapeResult } from '../types.js';

export function parseZhihu(html: string, brand: string, capturedAt = new Date().toISOString()): ScrapeResult {
  const sourceUrl = 'https://www.zhihu.com/search?type=content&q=' + encodeURIComponent(brand + ' 白酒');
  const $ = cheerio.load(html);
  const emptyMessage = describeEmptyPage($);
  if (emptyMessage.startsWith('平台要求')) return unavailableResult(sourceUrl, emptyMessage);
  const news: NewsItem[] = [];
  $('.SearchResult-Card, .ContentItem').each((_, element) => {
    const card = $(element);
    const link = card.find('.ContentItem-title a[href], h2 a[href]').first();
    const url = safePublicUrl(link.attr('href'), sourceUrl);
    if (!url) return;
    const parsed = new URL(url);
    if (!/(^|\.)zhihu\.com$/.test(parsed.hostname) || !/^\/(?:question|zvideo|p)\//.test(parsed.pathname)) return;
    const item = makeNewsItem({
      title: link.text(), url, source: '知乎公开搜索',
      summary: card.find('.RichContent-inner').first().text(),
      publishedAt: card.find('time[datetime]').first().attr('datetime') || null,
    }, brand, sourceUrl, capturedAt);
    if (item) news.push(item);
  });
  const hotWords = collectHotWords($, '.TopicLink, .Tag-content a', brand);
  return buildScrapeResult(sourceUrl, news, hotWords, null, emptyMessage);
}

export async function fetchZhihu(brand: string): Promise<ScrapeResult> {
  const url = 'https://www.zhihu.com/search?type=content&q=' + encodeURIComponent(brand + ' 白酒');
  try { return parseZhihu(await readPublicPage(url, 'https://www.zhihu.com/'), brand); }
  catch (error) { return scrapeError(url, error); }
}
