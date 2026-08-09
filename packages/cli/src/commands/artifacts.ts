import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';
import { loadConfig } from '@mobileproof/config';

async function latestRun(directory: string): Promise<string> {
  const entries = (await readdir(directory)).sort().reverse();
  const latest = entries[0];
  if (!latest) throw new Error('No MobileProof runs exist');
  return latest;
}

export async function attestCommand(configPath: string, runId?: string): Promise<number> {
  const config = await loadConfig(configPath);
  const selected = runId ?? await latestRun(config.artifactDirectory);
  const attestation = path.join(config.artifactDirectory, selected, 'attestation.json');
  process.stdout.write(await readFile(attestation, 'utf8'));
  return 0;
}

export async function openArtifactsCommand(configPath: string, runId?: string): Promise<number> {
  const config = await loadConfig(configPath);
  const selected = runId ?? await latestRun(config.artifactDirectory);
  const report = path.join(config.artifactDirectory, selected, 'summary.html');
  const command = process.platform === 'darwin' ? ['open', report]
    : process.platform === 'win32' ? ['cmd', '/c', 'start', '', report]
      : ['xdg-open', report];
  const [executable, ...args] = command;
  if (!executable) return 1;
  await execa(executable, args);
  return 0;
}

export async function resolveRun(configPath: string, runId: string): Promise<{ suite: string; failedFlows: string[]; platforms: Array<'ios' | 'android'> }> {
  const config = await loadConfig(configPath);
  const summary = JSON.parse(await readFile(path.join(config.artifactDirectory, runId, 'summary.json'), 'utf8')) as {
    suite: string;
    flows: Array<{ id: string; status: string }>;
    platforms: Array<'ios' | 'android'>;
  };
  return { suite: summary.suite, failedFlows: summary.flows.filter((flow) => flow.status === 'failed').map((flow) => flow.id), platforms: summary.platforms };
}
