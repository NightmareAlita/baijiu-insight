import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Exercise the packaged application itself, rather than the development runtime.
const requestedPath = process.argv[2];
if (!requestedPath) {
  console.error('Missing packaged application path');
  process.exit(1);
}
let executable = path.resolve(requestedPath);
if (executable.endsWith('.app')) {
  const binaries = path.join(executable, 'Contents', 'MacOS');
  const productBinary = path.join(binaries, 'BaijiuInsight');
  executable = existsSync(productBinary) ? productBinary : path.join(binaries, readdirSync(binaries)[0]);
}
if (!existsSync(executable)) throw new Error(`Packaged executable does not exist: ${executable}`);

// ELECTRON_RUN_AS_NODE must not leak from an IDE into the application.
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const processHandle = spawn(executable, ['--smoke-test'], { env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
processHandle.stdout.on('data', (chunk) => { output += chunk; process.stdout.write(chunk); });
processHandle.stderr.on('data', (chunk) => { process.stderr.write(chunk); });
const timer = setTimeout(() => {
  console.error('Packaged application startup timed out');
  processHandle.kill();
  process.exitCode = 1;
}, 30_000);
processHandle.once('error', (error) => {
  clearTimeout(timer);
  console.error(error.message);
  process.exitCode = 1;
});
processHandle.once('exit', (code) => {
  clearTimeout(timer);
  process.exitCode = code === 0 && output.includes('DESKTOP_SMOKE_OK') ? 0 : 1;
});
