// 查询加载骨架屏
export function LoadingSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6 fade-in-up">
      {/* 概览卡片骨架 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-ink-200 p-5">
            <div className="shimmer w-10 h-10 rounded-xl mb-3" />
            <div className="shimmer h-8 w-16 rounded mb-2" />
            <div className="shimmer h-4 w-20 rounded mb-1" />
            <div className="shimmer h-3 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* 图表骨架 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-ink-200 p-5">
            <div className="shimmer h-5 w-40 rounded mb-4" />
            <div className="shimmer h-64 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* 平台骨架 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-ink-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="shimmer w-10 h-10 rounded-xl" />
              <div className="flex-1">
                <div className="shimmer h-4 w-20 rounded mb-1.5" />
                <div className="shimmer h-3 w-28 rounded" />
              </div>
            </div>
            <div className="shimmer h-24 w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
