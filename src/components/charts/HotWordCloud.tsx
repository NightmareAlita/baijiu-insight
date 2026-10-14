import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import 'echarts-wordcloud';
import type { HotWord } from '../../types';
import { ChartEmptyState } from './ChartEmptyState';

export function HotWordCloud({ words }: { words: HotWord[] }) {
  const available = words.filter((word) => word.name && Number.isFinite(word.value) && word.value > 0).slice(0, 80);
  if (!available.length) return <ChartEmptyState message="尚无可统计的公开内容，不展示预设词条或虚构频次。" />;
  const palette = ['#8c4e24', '#a96629', '#c07f34', '#cd9752', '#734024', '#5f3620'];
  const option = {
    tooltip: { show: true, renderMode: 'richText', formatter: '{b}：{c} 次' },
    series: [{ type: 'wordCloud', shape: 'circle', left: 'center', top: 'center', width: '95%', height: '95%', sizeRange: [14, 42], rotationRange: [0, 0], gridSize: 8, drawOutOfBound: false, textStyle: { fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif', fontWeight: 'bold' }, emphasis: { textStyle: { shadowBlur: 5, shadowColor: 'rgba(0,0,0,0.2)' } }, data: available.map((word, index) => ({ ...word, textStyle: { color: palette[index % palette.length] } })) }],
  };
  return <div><ReactECharts option={option} notMerge style={{ height: 300 }} echarts={echarts} /><details className="text-sm text-ink-600"><summary className="cursor-pointer">查看词条与次数</summary><ul className="mt-3 flex flex-wrap gap-2">{available.map((word) => <li key={word.name} className="rounded bg-baijiu-50 px-2 py-1">{word.name} · {word.value} 次</li>)}</ul></details></div>;
}
