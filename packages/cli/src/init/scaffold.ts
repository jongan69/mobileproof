import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { stringify } from 'yaml';
import { MobileProofError } from '@mobileproof/core';
import { detectProject } from './detect.js';

export interface InitOptions {
  root: string;
  readyId: string;
  dryRun: boolean;
  force: boolean;
}

interface ProposedFile { path: string; contents: string }

async function exists(filePath: string): Promise<boolean> {
  try { await access(filePath); return true; } catch { return false; }
}

export async function proposeScaffold(options: InitOptions): Promise<ProposedFile[]> {
  const project = await detectProject(options.root);
  if (!project.iosId && !project.androidId) {
    throw new MobileProofError('No application ID was detected; configure ios.bundleIdentifier or android.package first', 'configuration');
  }
  const app: Record<string, { id: string }> = {};
  const devices: Record<string, object> = {};
  const platforms: string[] = [];
  if (project.iosId) {
    app.ios = { id: project.iosId };
    devices.ios = { type: 'simulator', selector: 'booted-or-create' };
    platforms.push('ios');
  }
  if (project.androidId) {
    app.android = { id: project.androidId };
    devices.android = { type: 'any', selector: 'connected-first' };
    platforms.push('android');
  }
  const checks = ['typecheck', 'lint', 'test']
    .filter((name) => project.scripts[name])
    .map((name) => ({ id: name, command: { argv: [project.packageManager, 'run', name], allowFailure: false }, suites: ['release'] }));
  const checkIds = checks.map((check) => check.id);
  const config = {
    schemaVersion: 1,
    project: { workspaceRoot: '.', appRoot: '.', framework: project.framework, packageManager: project.packageManager },
    app,
    build: {
      smoke: { strategy: project.framework === 'expo' ? 'expo-run' : 'installed', mode: 'debug', isolation: 'project' },
      release: { strategy: project.framework === 'expo' ? 'expo-run' : 'installed', mode: 'release', isolation: 'clean-copy' },
    },
    devices,
    checks,
    services: [],
    suites: {
      smoke: { buildProfile: 'smoke', strict: false, platforms, flows: [{ id: 'cold-launch', path: 'e2e/mobileproof/flows/cold-launch.yaml' }] },
      release: { buildProfile: 'release', strict: true, platforms, checks: checkIds, flows: [{ id: 'cold-launch', path: 'e2e/mobileproof/flows/cold-launch.yaml' }] },
    },
    coverage: { manifest: 'e2e/mobileproof/coverage.yaml' },
    artifacts: { directory: '.mobileproof/artifacts', retentionDays: 14 },
    redaction: { secretsFromEnvironment: [], patterns: [] },
  };
  const flow = `appId: \${APP_ID}\ntags:\n  - smoke\n  - lifecycle\n---\n- launchApp:\n    permissions:\n      all: deny\n- extendedWaitUntil:\n    visible:\n      id: ${options.readyId}\n    timeout: 30000\n- takeScreenshot: cold-launch\n- stopApp\n- launchApp\n- assertVisible:\n    id: ${options.readyId}\n`;
  const coverage = stringify({
    schemaVersion: 1,
    capabilities: {
      'lifecycle.coldLaunch': { applicable: true, releaseCritical: true, platforms, evidence: [{ type: 'maestro', id: 'cold-launch' }] },
      'lifecycle.restart': { applicable: true, releaseCritical: true, platforms, evidence: [{ type: 'maestro', id: 'cold-launch' }] },
    },
  });
  return [
    { path: path.join(project.root, 'mobileproof.yaml'), contents: stringify(config) },
    { path: path.join(project.root, 'e2e/mobileproof/flows/cold-launch.yaml'), contents: flow },
    { path: path.join(project.root, 'e2e/mobileproof/coverage.yaml'), contents: coverage },
    { path: path.join(project.root, 'e2e/mobileproof/adapter.mjs'), contents: `export default {\n  apiVersion: 1,\n  async prepare() {},\n  async cleanup() {},\n};\n` },
  ];
}

export async function scaffoldProject(options: InitOptions): Promise<ProposedFile[]> {
  const files = await proposeScaffold(options);
  if (options.dryRun) return files;
  for (const file of files) {
    if (await exists(file.path) && !options.force) {
      throw new MobileProofError(`Refusing to overwrite existing file: ${file.path}`, 'configuration');
    }
    await mkdir(path.dirname(file.path), { recursive: true });
    await writeFile(file.path, file.contents);
  }
  const gitignore = path.join(path.resolve(options.root), '.gitignore');
  const current = await exists(gitignore) ? await readFile(gitignore, 'utf8') : '';
  if (!current.split('\n').includes('.mobileproof/')) {
    await writeFile(gitignore, `${current}${current.endsWith('\n') || current.length === 0 ? '' : '\n'}.mobileproof/\n`);
  }
  return files;
}
