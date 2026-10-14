import ReactECharts from 'echarts-for-react';
import type { TrendPoint } from '../../types';
import { ChartEmptyState } from './ChartEmptyState';

export function TrendLineChart({ data }: { data: TrendPoint[] }) {
  const points = data.filter((point) => point.date && Number.isFinite(point.value));
  if (!points.length) return <ChartEmptyState message="尚无连续历史采集记录。完成历史数据积累后可展示趋势。" />;
  const option = {
    tooltip: { trigger: 'axis', renderMode: 'richText' },
    grid: { left: 35, right: 15, top: 30, bottom: 40, containLabel: true },
    xAxis: { type: 'category', data: points.map((point) => point.date), axisLabel: { color: '#5c4a38', fontSize: 10, hideOverlap: true }, axisLine: { lineStyle: { color: '#e3d8c6' } }, axisTick: { show: false } },
    yAxis: { type: 'value', min: 0, axisLabel: { color: '#7a6650', fontSize: 11 }, splitLine: { lineStyle: { color: '#f3ece0' } } },
    series: [{ name: '热度', type: 'line', smooth: false, symbol: 'circle', symbolSize: 6, data: points.map((point) => point.value), itemStyle: { color: '#a96629' }, lineStyle: { width: 3, color: '#c07f34' }, areaStyle: { color: 'rgba(192,127,52,0.15)' } }],
  };
  return <ReactECharts option={option} notMerge style={{ height: 280 }} />;
}
