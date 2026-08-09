import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { BuildProfile, PackageManager, Platform, ResolvedConfig } from '@mobileproof/config';
import { MobileProofError } from '../errors.js';
import type { Device, Logger } from '../types.js';
import { runCommand } from '../system/process.js';
import { sha256 } from '../system/hash.js';

function installCommand(manager: PackageManager | undefined): string[] {
  switch (manager) {
    case 'pnpm': return ['pnpm', 'install', '--frozen-lockfile'];
    case 'yarn': return ['yarn', 'install', '--frozen-lockfile'];
    case 'bun': return ['bun', 'install', '--frozen-lockfile'];
    default: return ['npm', 'ci'];
  }
}

async function createIsolatedConfig(config: ResolvedConfig): Promise<{ config: ResolvedConfig; directory: string }> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mobileproof-build-'));
  const workspace = path.join(directory, 'workspace');
  const excluded = new Set(['node_modules', '.git', '.mobileproof', 'coverage']);
  await cp(config.workspaceRoot, workspace, {
    recursive: true,
    dereference: false,
    filter(source) {
      const relative = path.relative(config.workspaceRoot, source);
      const segments = relative.split(path.sep);
      if (segments.some((segment) => excluded.has(segment))) return false;
      if (relative === 'ios/build' || relative.startsWith(`ios${path.sep}build${path.sep}`)) return false;
      if (relative.includes(`${path.sep}.gradle${path.sep}`) || relative.endsWith(`${path.sep}.gradle`)) return false;
      if (relative.includes(`${path.sep}build${path.sep}`) && relative.startsWith('android')) return false;
      return true;
    },
  });
  await runCommand(installCommand(config.project.packageManager), { cwd: workspace, timeoutMs: 1_200_000 });
  const relativeAppRoot = path.relative(config.workspaceRoot, config.appRoot);
  return {
    directory,
    config: { ...config, workspaceRoot: workspace, appRoot: path.join(workspace, relativeAppRoot) },
  };
}

function expoCommand(manager: PackageManager | undefined): string[] {
  switch (manager) {
    case 'pnpm': return ['pnpm', 'exec', 'expo'];
    case 'yarn': return ['yarn', 'expo'];
    case 'bun': return ['bunx', 'expo'];
    default: return ['npx', 'expo'];
  }
}

export async function installApplication(platform: Platform, device: Device, artifact: string, cwd: string): Promise<void> {
  await access(artifact);
  if (platform === 'android') await runCommand(['adb', '-s', device.id, 'install', '-r', artifact], { cwd });
  else await runCommand(['xcrun', 'simctl', 'install', device.id, artifact], { cwd });
}

export async function buildAndInstall(input: {
  config: ResolvedConfig;
  profile: BuildProfile;
  platform: Platform;
  device: Device;
  skipBuild: boolean;
  logger: Logger;
  fingerprint?: string;
}): Promise<void> {
  const { config, profile, platform, device } = input;
  if (profile.strategy === 'installed' || input.skipBuild) return;
  const appId = config.app[platform]?.id;
  const cacheDirectory = path.resolve(config.artifactDirectory, '..', 'cache', 'installations');
  const cacheFile = path.join(cacheDirectory, `${sha256(`${platform}:${device.id}:${appId ?? ''}`).slice(0, 24)}.json`);
  if (input.fingerprint && appId) {
    try {
      const cached = JSON.parse(await readFile(cacheFile, 'utf8')) as { fingerprint?: string };
      if (cached.fingerprint === input.fingerprint) {
        const check = platform === 'android'
          ? ['adb', '-s', device.id, 'shell', 'pm', 'path', appId]
          : ['xcrun', 'simctl', 'get_app_container', device.id, appId, 'app'];
        const installed = await runCommand({ argv: check, allowFailure: true }, { cwd: config.appRoot });
        if (installed.exitCode === 0 && installed.stdout.trim()) {
          input.logger.info(`Reusing installed ${platform} build for unchanged native fingerprint`);
          return;
        }
      }
    } catch {
      // Missing or invalid cache entries are safe misses.
    }
  }
  if (profile.isolation === 'clean-copy') {
    input.logger.info('Creating an isolated source snapshot');
    const isolated = await createIsolatedConfig(config);
    try {
      await buildAndInstall({ ...input, config: isolated.config, profile: { ...profile, isolation: 'project' } });
    } finally {
      await rm(isolated.directory, { recursive: true, force: true });
    }
    return;
  }
  input.logger.info(`Building ${platform} (${profile.mode})`);
  if (profile.strategy === 'custom') {
    if (!profile.command) throw new MobileProofError('Custom build requires command', 'configuration');
    await runCommand(profile.command, { cwd: config.appRoot });
    if (profile.artifact) await installApplication(platform, device, path.resolve(config.appRoot, profile.artifact), config.appRoot);
  } else if (profile.strategy === 'eas-local') {
    if (!profile.artifact) throw new MobileProofError('EAS local profiles require an installable artifact path', 'configuration');
    const output = path.resolve(config.appRoot, profile.artifact);
    await runCommand(['npx', 'eas-cli', 'build', '--local', '--non-interactive', '--platform', platform, '--output', output], { cwd: config.appRoot });
    await installApplication(platform, device, output, config.appRoot);
  } else {
    const framework = config.project.framework ?? 'auto';
    if (profile.strategy === 'expo-run' || profile.strategy === 'auto' || framework === 'expo') {
      const command = expoCommand(config.project.packageManager);
      command.push(`run:${platform}`, '--device', device.id);
      if (platform === 'android' && profile.mode === 'release') command.push('--variant', 'release');
      if (platform === 'ios' && profile.mode === 'release') command.push('--configuration', 'Release');
      await runCommand(command, { cwd: config.appRoot, timeoutMs: 7_200_000 });
    } else {
      throw new MobileProofError('Bare React Native automatic build is ambiguous; configure a custom build command', 'build');
    }
  }
  if (input.fingerprint) {
    await mkdir(cacheDirectory, { recursive: true });
    await writeFile(cacheFile, `${JSON.stringify({ fingerprint: input.fingerprint, platform, deviceId: device.id, appId, updatedAt: new Date().toISOString() })}\n`, { mode: 0o600 });
  }
}
