// API 契约与 src/types/index.ts 同步。
export type PlatformId = 'weibo' | 'baidu' | 'douyin' | 'xiaohongshu' | 'zhihu' | 'news';
export type DataSource = 'real' | 'unavailable';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type PlatformStatus = 'available' | 'unavailable' | 'error';

export interface PlatformInfo {
  id: PlatformId;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  // 原页面未提供时为 null；不以采集日期代替发布时间。
  publishedAt: string | null;
  capturedAt: string;
  summary: string;
  sentiment: Sentiment;
}

// value 表示采集公开页面中该词条的出现次数，不能当成平台热度。
export interface HotWord { name: string; value: number }
export interface TrendPoint { date: string; value: number }
export interface SentimentDistribution { positive: number; neutral: number; negative: number }

export interface PlatformData {
  platform: PlatformInfo;
  rank: number | null;
  heatIndex: number | null;
  // 只记录页面明示的搜索结果数；采集样本数由 sampleCount 单列。
  volume: number | null;
  volumeType: 'search-results' | null;
  volumeLabel: string;
  sampleCount: number;
  sentiment: SentimentDistribution | null;
  // 规则情感样本分数：正面=100、中性=50、负面=0。
  reputation: number | null;
  trend: TrendPoint[];
  news: NewsItem[];
  hotWords: HotWord[];
  dataSource: DataSource;
  status: PlatformStatus;
  statusMessage: string;
  sourceUrl: string;
  metricNotes: string;
}

export interface ReputationDimension { name: string; value: number }

export interface BrandReport {
  brand: string;
  queriedAt: string;
  status: 'available' | 'partial' | 'unavailable';
  sampleCount: number;
  availablePlatforms: number;
  methodology: string;
  overallRank: number | null;
  overallHeat: number | null;
  overallReputation: number | null;
  overallSentiment: Sentiment | null;
  platforms: PlatformData[];
  reputationDimensions: ReputationDimension[];
  overallTrend: TrendPoint[];
  allHotWords: HotWord[];
}

export interface ScrapeResult {
  news: NewsItem[];
  hotWords: HotWord[];
  volume: number | null;
  volumeType: 'search-results' | null;
  volumeLabel: string;
  sourceUrl: string;
  status: PlatformStatus;
  statusMessage: string;
}
