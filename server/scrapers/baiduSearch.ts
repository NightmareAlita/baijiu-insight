import * as cheerio from 'cheerio';
import { buildScrapeResult, collectHotWords, describeEmptyPage, makeNewsItem, parseResultCount, readPublicPage, scrapeError, unavailableResult } from '../common.js';
import type { NewsItem, ScrapeResult } from '../types.js';

export function parseBaiduSearch(html: string, brand: string, capturedAt = new Date().toISOString()): ScrapeResult {
  const sourceUrl = 'https://www.baidu.com/s?wd=' + encodeURIComponent(brand + ' 白酒');
  const $ = cheerio.load(html);
  const emptyMessage = describeEmptyPage($);
  if (emptyMessage.startsWith('平台要求')) return unavailableResult(sourceUrl, emptyMessage);
  const news: NewsItem[] = [];
  $('.result.c-container, .result-op.c-container').each((_, element) => {
    const card = $(element);
    const link = card.find('h3 a').first();
    const item = makeNewsItem({
      title: link.text(),
      summary: card.find('.c-abstract, .content-right_8Zs40, .c-span-last').first().text(),
      source: '百度公开搜索',
      url: link.attr('href'),
    }, brand, sourceUrl, capturedAt);
    if (item) news.push(item);
  });
  const hotWords = collectHotWords($, '#rs a, .rs-link_2DE3Q, .opr-recommends-merge-content a', brand);
  const volume = parseResultCount($('.nums, .search_tool').text() || $('body').text(), 'baidu');
  return buildScrapeResult(sourceUrl, news, hotWords, volume, emptyMessage);
}

export async function fetchBaiduSearch(brand: string): Promise<ScrapeResult> {
  const url = 'https://www.baidu.com/s?wd=' + encodeURIComponent(brand + ' 白酒');
  try { return parseBaiduSearch(await readPublicPage(url), brand); }
  catch (error) { return scrapeError(url, error); }
}
