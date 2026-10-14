import * as cheerio from 'cheerio';
import { buildScrapeResult, collectHotWords, describeEmptyPage, makeNewsItem, parseResultCount, readPublicPage, scrapeError, unavailableResult } from '../common.js';
import type { NewsItem, ScrapeResult } from '../types.js';

export function parseBaiduNews(html: string, brand: string, capturedAt = new Date().toISOString()): ScrapeResult {
  const sourceUrl = 'https://www.baidu.com/s?tn=news&rtt=4&bsst=1&cl=2&wd=' + encodeURIComponent(brand + ' 白酒');
  const $ = cheerio.load(html);
  const emptyMessage = describeEmptyPage($);
  if (emptyMessage.startsWith('平台要求')) return unavailableResult(sourceUrl, emptyMessage);
  const news: NewsItem[] = [];
  $('.result-op, .result').each((_, element) => {
    const card = $(element);
    const link = card.find('h3 a, .news-title a').first();
    const sourceText = card.find('.news-source, .c-color-gray').first().text().trim();
    const date = sourceText.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d+\s*(?:小时|天|分钟)前/);
    const source = (date ? sourceText.slice(0, date.index) : sourceText).trim() || '百度新闻搜索';
    const item = makeNewsItem({
      title: link.text(),
      summary: card.find('.c-abstract, .c-span-last, .content-right_8Zs40').first().text(),
      source,
      url: link.attr('href'),
      publishedAt: date?.[0] || null,
    }, brand, sourceUrl, capturedAt);
    if (item) news.push(item);
  });
  const hotWords = collectHotWords($, '.opr-recommends-merge-content a, .rs-link_2DE3Q', brand);
  const volume = parseResultCount($('.nums').text(), 'baidu');
  // 没有明确结果总数时为 null；新闻采集条数不能推算全网声量。
  return buildScrapeResult(sourceUrl, news, hotWords, volume, emptyMessage);
}

export async function fetchBaiduNews(brand: string): Promise<ScrapeResult> {
  const url = 'https://www.baidu.com/s?tn=news&rtt=4&bsst=1&cl=2&wd=' + encodeURIComponent(brand + ' 白酒');
  try { return parseBaiduNews(await readPublicPage(url), brand); }
  catch (error) { return scrapeError(url, error); }
}
