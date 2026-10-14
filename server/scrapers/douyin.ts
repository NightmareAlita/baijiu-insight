import * as cheerio from 'cheerio';
import { buildScrapeResult, describeEmptyPage, makeNewsItem, readPublicPage, safePublicUrl, scrapeError, unavailableResult } from '../common.js';
import type { NewsItem, ScrapeResult } from '../types.js';

// 只收录带视频永久链接的公开内容；动态页/登录墙返回不可用。
export function parseDouyin(html: string, brand: string, capturedAt = new Date().toISOString()): ScrapeResult {
  const sourceUrl = 'https://www.douyin.com/search/' + encodeURIComponent(brand + ' 白酒');
  const $ = cheerio.load(html);
  const emptyMessage = describeEmptyPage($);
  if (emptyMessage.startsWith('平台要求')) return unavailableResult(sourceUrl, emptyMessage);
  const news: NewsItem[] = [];
  $('a[href*="/video/"]').each((_, element) => {
    const link = $(element);
    const url = safePublicUrl(link.attr('href'), sourceUrl);
    if (!url) return;
    const parsed = new URL(url);
    if (!/(^|\.)douyin\.com$/.test(parsed.hostname) || !/^\/video\/\d+\/?$/.test(parsed.pathname)) return;
    const title = link.find('[data-e2e="video-desc"], .title, .desc').first().text() || link.attr('title') || link.text();
    const item = makeNewsItem({ title, summary: title, source: '抖音公开视频', url }, brand, sourceUrl, capturedAt);
    if (item) news.push(item);
  });
  return buildScrapeResult(sourceUrl, news, [], null, emptyMessage);
}

export async function fetchDouyin(brand: string): Promise<ScrapeResult> {
  const url = 'https://www.douyin.com/search/' + encodeURIComponent(brand + ' 白酒');
  try { return parseDouyin(await readPublicPage(url, 'https://www.douyin.com/'), brand); }
  catch (error) { return scrapeError(url, error); }
}
