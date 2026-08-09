import { access } from 'node:fs/promises';
import type { Platform, ResolvedConfig } from '@mobileproof/config';
import { runCommand } from '../system/process.js';

export interface DoctorCheck {
  id: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

async function commandCheck(id: string, argv: string[], cwd: string, required = true): Promise<DoctorCheck> {
  try {
    const result = await runCommand(argv, { cwd, timeoutMs: 15_000 });
    return { id, status: 'pass', message: result.stdout.split('\n')[0] || 'available' };
  } catch {
    return { id, status: required ? 'fail' : 'warn', message: `${argv[0]} is not available` };
  }
}

export async function runDoctor(config: ResolvedConfig, platforms: Platform[]): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];
  const major = Number(process.versions.node.split('.')[0]);
  checks.push({ id: 'node', status: major >= 22 ? 'pass' : 'fail', message: `Node ${process.versions.node}` });
  checks.push(await commandCheck('maestro', [process.env.MOBILEPROOF_MAESTRO ?? 'maestro', '--version'], config.appRoot));
  checks.push(await commandCheck('java', ['java', '-version'], config.appRoot));
  if (platforms.includes('android')) checks.push(await commandCheck('adb', ['adb', 'version'], config.appRoot));
  if (platforms.includes('ios')) checks.push(await commandCheck('xcode', ['xcrun', 'simctl', 'help'], config.appRoot));
  try {
    await access(config.appRoot);
    checks.push({ id: 'app-root', status: 'pass', message: config.appRoot });
  } catch {
    checks.push({ id: 'app-root', status: 'fail', message: `Missing ${config.appRoot}` });
  }
  for (const platform of platforms) {
    checks.push({
      id: `app-id-${platform}`,
      status: config.app[platform]?.id ? 'pass' : 'fail',
      message: config.app[platform]?.id ?? 'Application ID is not configured',
    });
  }
  return checks;
}
