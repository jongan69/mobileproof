import { loadConfig } from '@mobileproof/config';
import { runSuite } from '@mobileproof/core';
import type { Platform } from '@mobileproof/config';
import { terminalLogger } from '../ui/logger.js';

export async function runCommand(options: {
  suite: string;
  config: string;
  platform?: Platform;
  device?: string;
  skipBuild?: boolean;
  strict?: boolean;
  flowIds?: string[];
}): Promise<number> {
  const config = await loadConfig(options.config);
  const platforms = options.platform ? [options.platform] : undefined;
  const deviceIds = options.platform && options.device ? { [options.platform]: options.device } : undefined;
  const result = await runSuite({
    config,
    suite: options.suite,
    ...(platforms ? { platforms } : {}),
    ...(deviceIds ? { deviceIds } : {}),
    ...(options.skipBuild !== undefined ? { skipBuild: options.skipBuild } : {}),
    ...(options.strict !== undefined ? { strict: options.strict } : {}),
    ...(options.flowIds ? { flowIds: options.flowIds } : {}),
    logger: terminalLogger,
  });
  terminalLogger.info(`${result.status.toUpperCase()} · ${result.coverage.level} verified · ${result.artifactDirectory}`);
  return result.status === 'passed' ? 0 : 2;
}
