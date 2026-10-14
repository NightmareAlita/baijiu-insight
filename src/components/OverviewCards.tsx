import type { BrandReport, Sentiment } from '../types';
import { formatMetric } from '../utils/display';

const SENTIMENT_LABEL: Record<Sentiment, { text: string; color: string }> = {
  positive: { text: '偏正面', color: '#52a86a' },
  neutral: { text: '中性', color: '#cd9752' },
  negative: { text: '偏负面', color: '#d9655c' },
};

export function OverviewCards({ report }: { report: BrandReport }) {
  const sentiment = report.overallSentiment ? SENTIMENT_LABEL[report.overallSentiment] : null;
  const cards = [
    { label: '综合排名', value: report.overallRank === null ? '待采集' : `#${report.overallRank}`, sub: report.overallRank === null ? '尚无可核验的品类排名' : '以来源注明的统计口径为准', icon: '🏆', accent: '#d4a017' },
    { label: '综合热度', value: formatMetric(report.overallHeat), sub: report.overallHeat === null ? '尚无统一、可比较的热度指标' : '归一化指数（0–100）', icon: '🔥', accent: '#d9655c' },
    { label: '样本情感分数', value: formatMetric(report.overallReputation), sub: report.overallReputation === null ? '尚未采集到可分析样本' : '标题与摘要规则评分（0–100）', icon: '⭐', accent: '#8c4e24' },
    { label: '样本情感倾向', value: sentiment?.text ?? '待采集', sub: sentiment ? `基于 ${report.sampleCount} 条公开样本` : '尚未采集到可分析样本', icon: '💬', accent: sentiment?.color ?? '#9d8a72' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <div key={card.label} className="min-w-0 bg-white rounded-2xl border border-ink-200 p-4 sm:p-5 card-hover relative overflow-hidden">
          <div aria-hidden="true" className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10" style={{ background: card.accent }} />
          <div aria-hidden="true" className="text-3xl mb-2">{card.icon}</div>
          <div className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: card.accent }}>{card.value}</div>
          <div className="text-sm text-ink-700 font-medium">{card.label}</div>
          <div className="text-xs text-ink-500 mt-1">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
