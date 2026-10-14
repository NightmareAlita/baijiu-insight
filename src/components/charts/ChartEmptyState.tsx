export function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="min-h-60 flex flex-col justify-center items-center gap-3 rounded-xl bg-baijiu-50 px-6 py-8 text-center">
      <span aria-hidden="true" className="text-3xl text-ink-400">⌁</span>
      <p className="font-medium text-ink-600">待采集</p>
      <p className="text-sm text-ink-500 max-w-sm">{message}</p>
    </div>
  );
}
