import * as cheerio from 'cheerio';
import { buildScrapeResult, describeEmptyPage, makeNewsItem, readPublicPage, safePublicUrl, scrapeError, unavailableResult } from '../common.js';
import type { NewsItem, ScrapeResult } from '../types.js';

// 只收录带笔记永久链接的公开内容；不把界面文字当成笔记。
export function parseXiaohongshu(html: string, brand: string, capturedAt = new Date().toISOString()): ScrapeResult {
  const sourceUrl = 'https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(brand + ' 白酒');
  const $ = cheerio.load(html);
  const emptyMessage = describeEmptyPage($);
  if (emptyMessage.startsWith('平台要求')) return unavailableResult(sourceUrl, emptyMessage);
  const news: NewsItem[] = [];
  $('a[href*="/explore/"], a[href*="/discovery/item/"]').each((_, element) => {
    const link = $(element);
    const url = safePublicUrl(link.attr('href'), sourceUrl);
    if (!url) return;
    const parsed = new URL(url);
    if (!/(^|\.)xiaohongshu\.com$/.test(parsed.hostname) || !/^\/(?:explore|discovery\/item)\/[a-zA-Z0-9]+\/?$/.test(parsed.pathname)) return;
    const title = link.find('.title').first().text() || link.closest('.note-item').find('.title').first().text() || link.attr('title') || link.text();
    const item = makeNewsItem({ title, summary: title, source: '小红书公开笔记', url }, brand, sourceUrl, capturedAt);
    if (item) news.push(item);
  });
  return buildScrapeResult(sourceUrl, news, [], null, emptyMessage);
}

export async function fetchXiaohongshu(brand: string): Promise<ScrapeResult> {
  const url = 'https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(brand + ' 白酒');
  try { return parseXiaohongshu(await readPublicPage(url, 'https://www.xiaohongshu.com/'), brand); }
  catch (error) { return scrapeError(url, error); }
}
