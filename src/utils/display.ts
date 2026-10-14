export function safeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function formatTimestamp(value: string | null): string {
  if (!value) return '未提供';
  // 日级日期及“2 小时前”等来源原文不补造时分。
  if (!/[Tt ]\d{1,2}:\d{2}/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

export function formatMetric(value: number | null): string {
  return value === null || !Number.isFinite(value) ? '待采集' : value.toLocaleString('zh-CN', { maximumFractionDigits: 1 });
}
