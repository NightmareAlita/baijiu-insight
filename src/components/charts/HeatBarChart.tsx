import ReactECharts from 'echarts-for-react';
import type { PlatformData } from '../../types';
import { ChartEmptyState } from './ChartEmptyState';

export function HeatBarChart({ platforms }: { platforms: PlatformData[] }) {
  const available = platforms.filter((platform) => platform.heatIndex !== null && Number.isFinite(platform.heatIndex));
  if (!available.length) return <ChartEmptyState message="尚未接入可核验且口径一致的热度数据，无法进行跨平台比较。" />;
  const option = {
    tooltip: { trigger: 'axis', renderMode: 'richText', axisPointer: { type: 'shadow' } },
    grid: { left: 40, right: 15, top: 30, bottom: 45, containLabel: true },
    xAxis: { type: 'category', data: available.map((platform) => platform.platform.name), axisLabel: { color: '#5c4a38', fontSize: 11, interval: 0 }, axisLine: { lineStyle: { color: '#e3d8c6' } }, axisTick: { show: false } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: '#7a6650', fontSize: 11 }, splitLine: { lineStyle: { color: '#f3ece0' } } },
    series: [{ name: '热度指数', type: 'bar', data: available.map((platform) => ({ value: platform.heatIndex, itemStyle: { color: platform.platform.color, borderRadius: [6, 6, 0, 0] } })), barWidth: '45%', label: { show: true, position: 'top', color: '#3d2f22', fontWeight: 600, fontSize: 12 } }],
  };
  return <ReactECharts option={option} notMerge style={{ height: 280 }} />;
}
