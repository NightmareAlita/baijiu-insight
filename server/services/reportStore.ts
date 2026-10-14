import type { BrandReport } from '../types.js';

export class QueryBusyError extends Error {
  constructor() {
    super('当前查询较多，请稍后重试');
  }
}

export function normalizeBrand(value: string): string {
  const brand = value.trim();
  const characters = [...brand];
  const hasControlCharacter = characters.some((character) => {
    const code = character.codePointAt(0)!;
    return code < 32 || code === 127;
  });
  if (!brand || characters.length > 50 || hasControlCharacter) {
    throw new Error('请输入 1–50 个字符的品牌名称，不包含控制字符');
  }
  return brand;
}

export function createReportStore(
  query: (brand: string) => Promise<BrandReport>,
  options: { now?: () => number; ttlMs?: number; maxEntries?: number; maxConcurrent?: number } = {},
) {
  const now = options.now ?? Date.now;
  const ttlMs = options.ttlMs ?? 5 * 60_000;
  const maxEntries = options.maxEntries ?? 100;
  const maxConcurrent = options.maxConcurrent ?? 8;
  const cache = new Map<string, { report: BrandReport; expiresAt: number }>();
  const pending = new Map<string, Promise<BrandReport>>();

  return {
    async get(value: string): Promise<{ report: BrandReport; cache: 'hit' | 'shared' | 'miss' }> {
      const brand = normalizeBrand(value);
      const currentTime = now();
      for (const [key, entry] of cache) {
        if (entry.expiresAt <= currentTime) cache.delete(key);
      }
      const cached = cache.get(brand);
      if (cached) return { report: cached.report, cache: 'hit' };
      const running = pending.get(brand);
      if (running) return { report: await running, cache: 'shared' };
      if (pending.size >= maxConcurrent) throw new QueryBusyError();

      const task = Promise.resolve().then(() => query(brand));
      pending.set(brand, task);
      try {
        const report = await task;
        if (maxEntries > 0) {
          while (cache.size >= maxEntries) cache.delete(cache.keys().next().value!);
          const lifetime = report.status === 'unavailable' ? Math.min(ttlMs, 30_000) : ttlMs;
          cache.set(brand, { report, expiresAt: now() + lifetime });
        }
        return { report, cache: 'miss' };
      } finally {
        pending.delete(brand);
      }
    },
  };
}
