import ReactECharts from 'echarts-for-react';
import type { PlatformData } from '../../types';
import { ChartEmptyState } from './ChartEmptyState';

export function SentimentPieChart({ platforms }: { platforms: PlatformData[] }) {
  const aggregate = platforms.reduce((total, platform) => {
    if (!platform.sentiment || platform.sampleCount <= 0) return total;
    for (const item of platform.news) total[item.sentiment] += 1;
    return total;
  }, { positive: 0, neutral: 0, negative: 0 });
  const total = aggregate.positive + aggregate.neutral + aggregate.negative;
  if (!Number.isFinite(total) || total <= 0) return <ChartEmptyState message="尚未采集到可分析的公开样本，无法计算情感分布。" />;
  const rows = [
    { value: aggregate.positive, name: '正面', itemStyle: { color: '#52a86a' } },
    { value: aggregate.neutral, name: '中性', itemStyle: { color: '#cd9752' } },
    { value: aggregate.negative, name: '负面', itemStyle: { color: '#d9655c' } },
  ];
  const option = {
    tooltip: { trigger: 'item', renderMode: 'richText', formatter: '{b}：{d}%' },
    legend: { orient: 'horizontal', bottom: 5, left: 'center', textStyle: { color: '#3d2f22', fontSize: 12 }, itemWidth: 14, itemHeight: 14 },
    series: [{ type: 'pie', radius: ['45%', '72%'], center: ['50%', '44%'], avoidLabelOverlap: true, itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } }, data: rows }],
  };
  return <div><ReactECharts option={option} notMerge style={{ height: 260 }} /><p className="text-xs text-center text-ink-500">{rows.map((row) => `${row.name} ${(row.value / total * 100).toFixed(1)}%`).join(' · ')}</p></div>;
}
