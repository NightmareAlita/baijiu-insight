import { useState } from 'react';
import type { PlatformData, Sentiment } from '../types';
import { formatMetric, formatTimestamp, safeSourceUrl } from '../utils/display';

const SENTIMENT_META: Record<Sentiment, { label: string; color: string; bg: string }> = {
  positive: { label: '正面', color: '#52a86a', bg: 'rgba(82,168,106,0.12)' },
  neutral: { label: '中性', color: '#cd9752', bg: 'rgba(205,151,82,0.12)' },
  negative: { label: '负面', color: '#d9655c', bg: 'rgba(217,101,92,0.12)' },
};

export function PlatformPanel({ data }: { data: PlatformData }) {
  const [expanded, setExpanded] = useState(false);
  const { platform, rank, heatIndex, volume, sentiment, reputation, news, hotWords } = data;
  const sourceUrl = safeSourceUrl(data.sourceUrl);
  const stateLabel = data.status === 'available' ? '已采集样本' : data.status === 'error' ? '采集失败' : '待采集';
  const stateColor = data.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800';
  const visibleNews = expanded ? news : news.slice(0, 3);

  return (
    <section aria-label={`${platform.name}数据详情`} className="min-w-0 bg-white rounded-2xl border border-ink-200 overflow-hidden card-hover">
      <div className="px-4 sm:px-5 py-4 flex items-start justify-between gap-2" style={{ background: `linear-gradient(135deg, ${platform.color}15, ${platform.color}05)` }}>
        <div className="flex items-center gap-3 min-w-0">
          <div aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: platform.color }}>{platform.icon}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-ink-800 text-base">{platform.name}</h4><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${stateColor}`}>{stateLabel}</span></div>
            <div className="text-xs text-ink-500 mt-1">公开样本 {data.sampleCount} 条</div>
          </div>
        </div>
        <div className="shrink-0 text-right"><div className="text-lg font-bold" style={{ color: platform.color }}>{rank === null ? '待采集' : `#${rank}`}</div><div className="text-xs text-ink-500">品类排名</div></div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-ink-100">
        {[
          { label: '热度指数', value: formatMetric(heatIndex) },
          { label: '样本情感分数', value: formatMetric(reputation) },
          { label: data.volumeLabel || '公开搜索结果数', value: formatMetric(volume) },
        ].map((metric) => <div key={metric.label} className="min-w-0 bg-white px-2 py-3 text-center"><div className="text-lg font-bold text-baijiu-700 break-words">{metric.value}</div><div className="text-xs text-ink-500 mt-1">{metric.label}</div></div>)}
      </div>

      <div className="px-4 sm:px-5 py-3 text-xs leading-relaxed text-ink-500">
        <p>{data.statusMessage}</p>
        <p className="mt-1">{data.metricNotes}</p>
        {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-baijiu-700 underline underline-offset-2">查看采集来源 ↗</a>}
      </div>

      <div className="px-4 sm:px-5 pb-4">
        <div className="text-xs text-ink-500 mb-2">样本情感分布</div>
        {sentiment ? <>
          <div className="flex h-3 rounded-full overflow-hidden bg-ink-100" aria-hidden="true">
            <div className="h-full" style={{ width: `${sentiment.positive}%`, background: '#52a86a' }} />
            <div className="h-full" style={{ width: `${sentiment.neutral}%`, background: '#cd9752' }} />
            <div className="h-full" style={{ width: `${sentiment.negative}%`, background: '#d9655c' }} />
          </div>
          <div className="flex flex-wrap justify-between gap-1 text-xs text-ink-500 mt-1.5"><span>正面 {sentiment.positive}%</span><span>中性 {sentiment.neutral}%</span><span>负面 {sentiment.negative}%</span></div>
        </> : <p className="text-sm text-ink-500">待采集：尚无可分析样本。</p>}
      </div>

      <div className="px-4 sm:px-5 pb-4">
        <div className="text-xs text-ink-500 mb-2">样本高频词</div>
        {hotWords.length ? <div className="flex flex-wrap gap-1.5">{hotWords.slice(0, 6).map((word) => <span key={word.name} title={`出现 ${word.value} 次`} className="px-2 py-0.5 rounded-md text-xs font-medium break-words" style={{ color: platform.color, background: `${platform.color}12` }}>{word.name} · {word.value}</span>)}</div> : <p className="text-sm text-ink-500">待采集：尚无可统计的词条。</p>}
      </div>

      <div className="border-t border-ink-100 px-4 sm:px-5 py-4">
        <div className="text-xs text-ink-500 mb-2">公开内容与报道 · 情感标签为规则分析</div>
        {news.length ? <>
          <ul className="space-y-4">
            {visibleNews.map((item, index) => {
              const meta = SENTIMENT_META[item.sentiment];
              const url = safeSourceUrl(item.url);
              return <li key={`${item.url}-${index}`} className="flex gap-2 text-sm">
                <span className="self-start shrink-0 px-1.5 py-0.5 rounded text-xs font-medium mt-0.5" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                <div className="min-w-0 flex-1">
                  {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-ink-700 hover:text-baijiu-700 hover:underline leading-relaxed break-words">{item.title} <span className="text-xs" aria-label="在新窗口打开">↗</span></a> : <div className="text-ink-700 break-words">{item.title}</div>}
                  <div className="text-xs text-ink-500 mt-1">来源：{item.source || '未提供'}</div>
                  <div className="text-xs text-ink-500 mt-0.5">发布时间：{formatTimestamp(item.publishedAt)}</div>
                  <div className="text-xs text-ink-500 mt-0.5">采集时间：{formatTimestamp(item.capturedAt)}</div>
                  <details className="mt-2"><summary className="cursor-pointer text-xs text-baijiu-700">查看内容摘要</summary><p className="mt-2 text-xs leading-relaxed text-ink-600 whitespace-pre-wrap break-words">{item.summary || '来源未提供摘要，请打开原文查看。'}</p></details>
                </div>
              </li>;
            })}
          </ul>
          {news.length > 3 && <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="mt-4 text-xs text-baijiu-700 underline underline-offset-2">{expanded ? '收起更多内容' : `查看其余 ${news.length - 3} 条内容`}</button>}
        </> : <p className="text-sm text-ink-500">本次未采集到可追溯的公开内容。</p>}
      </div>
    </section>
  );
}
