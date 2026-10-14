import ReactECharts from 'echarts-for-react';
import type { ReputationDimension } from '../../types';
import { ChartEmptyState } from './ChartEmptyState';

export function ReputationRadarChart({ dimensions }: { dimensions: ReputationDimension[] }) {
  if (dimensions.length < 3 || dimensions.some((dimension) => !Number.isFinite(dimension.value))) return <ChartEmptyState message="尚无可追溯的分维度评分依据，不能生成口碑雷达图。" />;
  const option = {
    tooltip: { renderMode: 'richText' },
    radar: { indicator: dimensions.map((dimension) => ({ name: dimension.name, max: 100 })), shape: 'polygon', splitNumber: 4, axisName: { color: '#3d2f22', fontSize: 12, fontWeight: 500 }, splitLine: { lineStyle: { color: '#e3d8c6' } }, splitArea: { areaStyle: { color: ['rgba(245,236,224,0.4)', 'rgba(234,213,184,0.2)'] } }, axisLine: { lineStyle: { color: '#e3d8c6' } } },
    series: [{ type: 'radar', data: [{ value: dimensions.map((dimension) => dimension.value), name: '维度评分', itemStyle: { color: '#a96629' }, lineStyle: { color: '#a96629', width: 2 }, areaStyle: { color: 'rgba(192,127,52,0.3)' } }] }],
  };
  return <ReactECharts option={option} notMerge style={{ height: 300 }} />;
}
