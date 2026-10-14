import { app, BrowserWindow, dialog, shell } from 'electron';
import { createLocalServer, getExternalUrl } from './local-server.js';

const backend = createLocalServer(async () => (await import('../server-build/index.js')).default);
const smokeTest = process.argv.includes('--smoke-test');
let mainWindow;
let opening;

function openExternal(value) {
  const url = getExternalUrl(value);
  if (url) void shell.openExternal(url).catch((error) => console.error('无法打开来源链接:', error));
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return Promise.resolve();
  }
  if (opening) return opening;
  opening = (async () => {
    const origin = await backend.start();
    const window = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 720,
      minHeight: 600,
      title: '白酒品牌洞察',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    mainWindow = window;
    window.webContents.setWindowOpenHandler(({ url }) => {
      openExternal(url);
      return { action: 'deny' };
    });
    window.webContents.on('will-navigate', (event, url) => {
      try {
        if (new URL(url).origin === origin) return;
      } catch { /* Block malformed navigation. */ }
      event.preventDefault();
      openExternal(url);
    });
    window.webContents.on('will-attach-webview', (event) => event.preventDefault());
    window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    window.on('closed', () => { mainWindow = undefined; });
    await window.loadURL(origin);
    if (smokeTest) {
      const response = await fetch(`${origin}/api/health`);
      if (!response.ok || (await response.json()).status !== 'ok') throw new Error('本地服务健康检查失败');
      console.log('DESKTOP_SMOKE_OK');
      await backend.stop();
      app.quit();
    } else {
      window.show();
    }
  })().finally(() => { opening = undefined; });
  return opening;
}

function handleStartupError(error) {
  console.error('应用启动失败:', error);
  if (smokeTest) {
    app.exit(1);
    return;
  }
  dialog.showErrorBox('白酒品牌洞察启动失败', `${error.message}\n请重新构建应用，或查看 README 中的排查步骤。`);
  app.quit();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(createWindow).catch(handleStartupError);
  app.on('second-instance', () => {
    void app.whenReady().then(createWindow).catch(handleStartupError);
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow().catch(handleStartupError);
  }
});

app.on('will-quit', () => { void backend.stop(); });
