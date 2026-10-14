// A single backend is shared by all windows, including macOS window reopening.
export function createLocalServer(loadApp) {
  let server;
  let starting;
  let origin;
  return {
    start() {
      if (origin) return Promise.resolve(origin);
      if (starting) return starting;
      starting = (async () => {
        const app = await loadApp();
        await new Promise((resolve, reject) => {
          server = app.listen(0, '127.0.0.1');
          server.once('error', reject);
          server.once('listening', () => {
            server.removeListener('error', reject);
            resolve();
          });
        });
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('无法获取本地服务端口');
        origin = `http://127.0.0.1:${address.port}`;
        return origin;
      })().finally(() => { starting = undefined; });
      return starting;
    },
    async stop() {
      if (starting) await starting.catch(() => {});
      origin = undefined;
      if (server) {
        const active = server;
        server = undefined;
        await new Promise((resolve) => {
          active.close(resolve);
          active.closeAllConnections?.();
        });
      }
    },
  };
}

export function getExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
