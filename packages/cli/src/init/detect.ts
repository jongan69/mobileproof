import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';

export interface DetectedProject {
  root: string;
  framework: 'expo' | 'react-native';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  iosId?: string;
  androidId?: string;
  scripts: Record<string, string>;
}

async function exists(filePath: string): Promise<boolean> {
  try { await access(filePath); return true; } catch { return false; }
}

function appIds(value: unknown): { iosId?: string; androidId?: string } {
  if (!value || typeof value !== 'object') return {};
  const expo = 'expo' in value && value.expo && typeof value.expo === 'object' ? value.expo : value;
  if (!expo || typeof expo !== 'object') return {};
  const ios = 'ios' in expo && expo.ios && typeof expo.ios === 'object' ? expo.ios : undefined;
  const android = 'android' in expo && expo.android && typeof expo.android === 'object' ? expo.android : undefined;
  const iosId = ios && 'bundleIdentifier' in ios && typeof ios.bundleIdentifier === 'string' ? ios.bundleIdentifier : undefined;
  const androidId = android && 'package' in android && typeof android.package === 'string' ? android.package : undefined;
  return { ...(iosId ? { iosId } : {}), ...(androidId ? { androidId } : {}) };
}

export async function detectProject(root: string): Promise<DetectedProject> {
  const absolute = path.resolve(root);
  const packageJson = JSON.parse(await readFile(path.join(absolute, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const framework = dependencies.expo ? 'expo' : 'react-native';
  const packageManager = await exists(path.join(absolute, 'pnpm-lock.yaml')) ? 'pnpm'
    : await exists(path.join(absolute, 'yarn.lock')) ? 'yarn'
      : await exists(path.join(absolute, 'bun.lockb')) || await exists(path.join(absolute, 'bun.lock')) ? 'bun' : 'npm';
  let ids: { iosId?: string; androidId?: string } = {};
  if (await exists(path.join(absolute, 'app.json'))) {
    ids = appIds(JSON.parse(await readFile(path.join(absolute, 'app.json'), 'utf8')));
  }
  if (framework === 'expo' && (!ids.iosId || !ids.androidId)) {
    const runner = packageManager === 'pnpm' ? ['pnpm', 'exec', 'expo']
      : packageManager === 'yarn' ? ['yarn', 'expo']
        : packageManager === 'bun' ? ['bunx', 'expo'] : ['npx', '--no-install', 'expo'];
    const [command, ...args] = [...runner, 'config', '--json'];
    if (command) {
      const result = await execa(command, args, { cwd: absolute, reject: false, timeout: 10_000 });
      if (result.exitCode === 0) ids = { ...ids, ...appIds(JSON.parse(result.stdout)) };
    }
  }
  return { root: absolute, framework, packageManager, scripts: packageJson.scripts ?? {}, ...ids };
}
