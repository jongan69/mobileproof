import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import fg from 'fast-glob';
import type { Platform } from '@mobileproof/config';
import type { Device } from '../types.js';
import { hashFile, sha256 } from './hash.js';
import { runCommand } from './process.js';

async function hashDirectory(directory: string): Promise<string> {
  const files = await fg(['**/*'], { cwd: directory, onlyFiles: true, dot: true, followSymbolicLinks: false });
  const chunks: string[] = [];
  for (const file of files.sort()) chunks.push(file, (await readFile(path.join(directory, file))).toString('base64'));
  return sha256(chunks.join('\0'));
}

export async function hashInstalledApplication(
  platform: Platform,
  device: Device,
  appId: string,
  cwd: string,
): Promise<string> {
  if (platform === 'ios') {
    const container = (await runCommand(['xcrun', 'simctl', 'get_app_container', device.id, appId, 'app'], { cwd })).stdout.trim();
    return hashDirectory(container);
  }
  const packagePath = (await runCommand(['adb', '-s', device.id, 'shell', 'pm', 'path', appId], { cwd })).stdout
    .split('\n').find((line) => line.startsWith('package:'))?.slice('package:'.length);
  if (!packagePath) throw new Error(`Cannot locate installed Android package: ${appId}`);
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mobileproof-apk-'));
  const local = path.join(directory, 'base.apk');
  try {
    await runCommand(['adb', '-s', device.id, 'pull', packagePath, local], { cwd, timeoutMs: 120_000 });
    return hashFile(local);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
