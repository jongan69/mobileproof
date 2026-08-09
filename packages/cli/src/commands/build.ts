import { loadConfig, type Platform } from '@mobileproof/config';
import { buildAndInstall } from '@mobileproof/core';
import { resolveDevice } from './device.js';
import { terminalLogger } from '../ui/logger.js';

export async function buildCommand(input: { config: string; profile: string; platform: Platform; device?: string }): Promise<number> {
  const config = await loadConfig(input.config);
  const profile = config.build[input.profile];
  if (!profile) throw new Error(`Unknown build profile: ${input.profile}`);
  const device = await resolveDevice(config, input.platform, input.device);
  await buildAndInstall({ config, profile, platform: input.platform, device, skipBuild: false, logger: terminalLogger });
  terminalLogger.info(`Built and installed ${input.platform} profile ${input.profile} on ${device.name}`);
  return 0;
}
