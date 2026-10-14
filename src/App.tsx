import { useState, useRef, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { Dashboard } from './components/Dashboard';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { queryBrand } from './services/brandService';
import type { BrandReport } from './types';

function App() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BrandReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const handleQuery = async (brand: string) => {
    const cleaned = brand.trim();
    if (!cleaned) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setSearchValue(cleaned);
    setLastQuery(cleaned);
    setLoading(true);
    setError(null);
    setCancelled(false);
    try {
      const data = await queryBrand(cleaned, { signal: controller.signal });
      if (requestRef.current === controller && !controller.signal.aborted) setReport(data);
    } catch (cause) {
      if (requestRef.current === controller && !controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : '查询失败，请重试');
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  const cancelQuery = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setCancelled(true);
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-ink-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-gradient-to-br from-baijiu-700 to-gold-500 flex items-center justify-center text-white font-bold text-xl shadow-md">酒</div>
            <div>
              <h1 className="text-lg font-bold text-ink-800 leading-tight">白酒品牌洞察</h1>
              <p className="text-xs text-ink-500">Baijiu Brand Intelligence</p>
            </div>
          </div>
          <span className="hidden sm:block text-sm text-ink-500">公开样本查询</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <section aria-label="品牌查询" className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 title-gradient">查看白酒品牌公开内容与口碑线索</h2>
          <p className="text-ink-500 mb-6">查询微博、百度、抖音、小红书、知乎及新闻媒体的公开内容；采集范围与缺失指标逐项标注。</p>
          <SearchBar onQuery={handleQuery} loading={loading} value={searchValue} onChange={setSearchValue} />
          {loading && (
            <div role="status" className="mt-4 text-sm text-ink-500">
              正在查询“{lastQuery}”的公开样本，最多等待 45 秒。
              <button type="button" onClick={cancelQuery} className="ml-3 text-baijiu-700 underline underline-offset-2">取消查询</button>
            </div>
          )}
          {error && (
            <div role="alert" className="mt-4 inline-flex flex-wrap justify-center items-center gap-3 px-4 py-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <span>“{lastQuery}”：{error}</span>
              <button type="button" onClick={() => handleQuery(lastQuery)} className="font-medium underline underline-offset-2">重试</button>
            </div>
          )}
          {cancelled && <p role="status" className="mt-4 text-sm text-ink-500">“{lastQuery}”的查询已取消。</p>}
        </section>

        <div aria-busy={loading}>
          {!loading && report && (error || cancelled) && <p role="status" className="mb-4 px-4 py-3 rounded-xl bg-amber-50 text-amber-800 text-sm">下方保留上次成功查询“{report.brand}”的报告，采集时间见报告；本次查询尚未产生新结果。</p>}
          {loading ? <LoadingSkeleton /> : report ? <Dashboard report={report} /> : <EmptyState onQuery={handleQuery} />}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center text-xs text-ink-500">
        <p>白酒品牌洞察系统 · 结果仅反映本次可采集的公开样本，数据范围和分析口径见查询报告。</p>
      </footer>
    </div>
  );
}

function EmptyState({ onQuery }: { onQuery: (brand: string) => void }) {
  const hotBrands = ['茅台', '五粮液', '泸州老窖', '剑南春', '汾酒', '洋河'];
  return (
    <div className="text-center py-12 fade-in-up">
      <div aria-hidden="true" className="inline-block mb-6"><div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-baijiu-100 to-baijiu-200 flex items-center justify-center text-4xl">🥃</div></div>
      <h3 className="text-xl font-bold text-ink-700 mb-2">输入品牌名，查看公开内容</h3>
      <p className="text-ink-500 text-sm mb-8">或点击下方品牌，查询可采集的报道与内容样本。</p>
      <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
        {hotBrands.map((brand) => <button key={brand} type="button" onClick={() => onQuery(brand)} className="px-5 py-2.5 bg-white border border-ink-200 rounded-full text-ink-700 font-medium hover:border-gold-500 hover:text-baijiu-700 hover:shadow-md transition-all">{brand}</button>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16 text-left">
        {[
          { icon: '📊', title: '数据覆盖', desc: '查看公开样本数量与平台采集状态，缺失数据明确展示' },
          { icon: '📰', title: '来源追溯', desc: '浏览内容摘要并打开原文，区分发布时间与采集时间' },
          { icon: '💬', title: '样本分析', desc: '查看标题与摘要的情感规则标签及高频词条' },
        ].map((feature) => <div key={feature.title} className="bg-white rounded-2xl border border-ink-200 p-6 card-hover"><div aria-hidden="true" className="text-3xl mb-3">{feature.icon}</div><div className="font-bold text-ink-800 mb-1">{feature.title}</div><div className="text-sm text-ink-500">{feature.desc}</div></div>)}
      </div>
    </div>
  );
}

export default App;
