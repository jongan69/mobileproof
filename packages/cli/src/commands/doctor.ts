import { loadConfig } from '@mobileproof/config';
import type { Platform } from '@mobileproof/config';
import { runDoctor } from '@mobileproof/core';

export async function doctorCommand(configPath: string, platform?: Platform): Promise<number> {
  const config = await loadConfig(configPath);
  const platforms = platform ? [platform] : Object.keys(config.app) as Platform[];
  const checks = await runDoctor(config, platforms);
  for (const check of checks) {
    const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '▲' : '✖';
    process.stdout.write(`${icon} ${check.id}: ${check.message}\n`);
  }
  return checks.some((check) => check.status === 'fail') ? 4 : 0;
}
