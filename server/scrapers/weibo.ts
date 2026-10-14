import * as cheerio from 'cheerio';
import { buildScrapeResult, collectHotWords, describeEmptyPage, makeNewsItem, parseResultCount, readPublicPage, safePublicUrl, scrapeError, unavailableResult } from '../common.js';
import type { NewsItem, ScrapeResult } from '../types.js';

export function parseWeibo(html: string, brand: string, capturedAt = new Date().toISOString()): ScrapeResult {
  const sourceUrl = 'https://s.weibo.com/weibo?q=' + encodeURIComponent(brand) + '&typeall=1&suball=1&Refer=g';
  const $ = cheerio.load(html);
  const emptyMessage = describeEmptyPage($);
  if (emptyMessage.startsWith('平台要求')) return unavailableResult(sourceUrl, emptyMessage);
  const news: NewsItem[] = [];
  $('.card-wrap').each((_, element) => {
    const card = $(element);
    const content = card.find('.txt[node-type="feed_list_content_full"]').first().text().trim() || card.find('.txt').first().text().trim();
    const link = card.find('.from a[href], a[href*="/status/"]').first();
    const url = safePublicUrl(link.attr('href'), sourceUrl);
    if (!url) return;
    const parsed = new URL(url);
    if (!/(^|\.)weibo\.(com|cn)$/.test(parsed.hostname) || !/\/(?:status\/[\w]+|\d+\/[\w]+)\/?$/.test(parsed.pathname)) return;
    const item = makeNewsItem({
      title: content.slice(0, 80), summary: content,
      source: '微博' + (card.find('.name').first().text().trim() ? '@' + card.find('.name').first().text().trim() : ''),
      url,
      publishedAt: link.text().trim() || null,
    }, brand, sourceUrl, capturedAt);
    if (item) news.push(item);
  });
  const hotWords = collectHotWords($, '.related-keyword a', brand);
  const volume = parseResultCount($('.m-page, .search_num, .card-no-result').text(), 'weibo');
  return buildScrapeResult(sourceUrl, news, hotWords, volume, emptyMessage);
}

export async function fetchWeibo(brand: string): Promise<ScrapeResult> {
  const url = 'https://s.weibo.com/weibo?q=' + encodeURIComponent(brand) + '&typeall=1&suball=1&Refer=g';
  try { return parseWeibo(await readPublicPage(url, 'https://s.weibo.com/'), brand); }
  catch (error) { return scrapeError(url, error); }
}
