import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aggregateBrandReport } from './services/aggregation.js';
import { createReportStore, normalizeBrand, QueryBusyError } from './services/reportStore.js';

const modulePath = fileURLToPath(import.meta.url);
const distDir = path.resolve(path.dirname(modulePath), '..', 'dist');

export function createApp(query = aggregateBrandReport) {
  const app = express();
  const store = createReportStore(query);
  app.disable('x-powered-by');

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.get('/api/brand/:name', async (req, res) => {
    let brand: string;
    try {
      brand = normalizeBrand(req.params.name);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    try {
      const result = await store.get(brand);
      res.set('X-Report-Cache', result.cache).json(result.report);
    } catch (error) {
      if (error instanceof QueryBusyError) {
        res.set('Retry-After', '10').status(503).json({ error: error.message });
      } else {
        console.error('[query] 查询失败:', error);
        res.status(500).json({ error: '查询服务暂时不可用，请稍后重试' });
      }
    }
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: '接口不存在' });
  });
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
  app.use((_req, res) => {
    res.status(404).json({ error: '页面不存在' });
  });
  app.use((error: Error & { status?: number }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(error);
    const status = error.status === 400 || error instanceof URIError ? 400 : 500;
    res.status(status).json({ error: status === 400 ? '请求格式错误' : '服务暂时不可用' });
  });
  return app;
}

const app = createApp();
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === modulePath;
if (isMainModule) {
  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT 必须是 0–65535 的整数');
  const host = process.env.HOST ?? '127.0.0.1';
  const server = app.listen(port, host, () => {
    const address = server.address();
    console.log(`白酒品牌洞察服务已启动: http://${host}:${typeof address === 'object' && address ? address.port : port}`);
  });
  server.on('error', (error) => {
    console.error('服务启动失败:', error.message);
    process.exitCode = 1;
  });
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5_000).unref();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

export default app;
