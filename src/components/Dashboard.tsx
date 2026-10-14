import type { BrandReport } from '../types';
import { OverviewCards } from './OverviewCards';
import { PlatformPanel } from './PlatformPanel';
import { HeatBarChart } from './charts/HeatBarChart';
import { TrendLineChart } from './charts/TrendLineChart';
import { SentimentPieChart } from './charts/SentimentPieChart';
import { ReputationRadarChart } from './charts/ReputationRadarChart';
import { HotWordCloud } from './charts/HotWordCloud';
import { formatTimestamp } from '../utils/display';

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="mb-4"><h3 className="text-lg font-bold text-ink-800 flex items-center gap-2"><span aria-hidden="true" className="w-1 h-5 bg-gradient-to-b from-baijiu-700 to-gold-500 rounded-full" />{title}</h3>{subtitle && <p className="text-sm text-ink-500 mt-1 ml-3">{subtitle}</p>}</div>;
}

export function Dashboard({ report }: { report: BrandReport }) {
  const available = report.platforms.filter((platform) => platform.status === 'available').length;
  const total = report.platforms.length;

  return (
    <div className="space-y-6 fade-in-up">
      <div className="bg-white rounded-2xl border border-ink-200 px-4 sm:px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div aria-hidden="true" className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-baijiu-700 to-gold-500 flex items-center justify-center text-white font-bold text-xl">{report.brand.charAt(0)}</div>
            <div className="min-w-0"><div className="text-xl font-bold text-ink-800 break-words">{report.brand}</div><div className="text-xs text-ink-500">查询时间：{formatTimestamp(report.queriedAt)}（北京时间）</div></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700">已采集 {available}/{total} 个平台</span>
            <span className="px-2.5 py-1 rounded-full bg-baijiu-50 text-baijiu-700">公开样本 {report.sampleCount} 条</span>
            {available < total && <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">未采集 {total - available} 个平台</span>}
          </div>
        </div>
        {report.status !== 'available' && (
          <p role="status" className="mt-4 px-3 py-2 bg-amber-50 text-amber-800 rounded-lg text-sm">
            {report.status === 'unavailable' ? '本次未采集到可核验的公开样本。请查看各平台的状态说明，稍后可再次查询。' : '本次仅采集到部分平台的公开样本。缺失指标显示“待采集”，结果不代表完整平台数据。'}
          </p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-ink-500">{report.methodology}</p>
      </div>

      <OverviewCards report={report} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-w-0 bg-white rounded-2xl border border-ink-200 p-4 sm:p-5"><SectionTitle title="各平台热度指标" subtitle="只有来源可核验、口径可比较的指标才会展示" /><HeatBarChart platforms={report.platforms} /></div>
        <div className="min-w-0 bg-white rounded-2xl border border-ink-200 p-4 sm:p-5"><SectionTitle title="历史热度趋势" subtitle="需要连续的历史采集记录" /><TrendLineChart data={report.overallTrend} /></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-w-0 bg-white rounded-2xl border border-ink-200 p-4 sm:p-5"><SectionTitle title="样本情感分布" subtitle="按采集样本数加权；标签来自标题与摘要的规则分析" /><SentimentPieChart platforms={report.platforms} /></div>
        <div className="min-w-0 bg-white rounded-2xl border border-ink-200 p-4 sm:p-5"><SectionTitle title="口碑维度评分" subtitle="需要可追溯的维度数据和明确评分依据" /><ReputationRadarChart dimensions={report.reputationDimensions} /></div>
      </div>
      <div className="min-w-0 bg-white rounded-2xl border border-ink-200 p-4 sm:p-5"><SectionTitle title="公开样本高频词" subtitle="词条数值为在采集内容中的出现次数" /><HotWordCloud words={report.allHotWords} /></div>
      <div><SectionTitle title="分平台详情" subtitle="查看样本数量、指标口径与原始来源" /><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{report.platforms.map((platform) => <PlatformPanel key={platform.platform.id} data={platform} />)}</div></div>
    </div>
  );
}
