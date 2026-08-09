import path from 'node:path';
import { loadConfig, type Platform } from '@mobileproof/config';
import { installApplication } from '@mobileproof/core';
import { resolveDevice } from './device.js';

export async function installCommand(input: { config: string; artifact: string; platform: Platform; device?: string }): Promise<number> {
  const config = await loadConfig(input.config);
  const device = await resolveDevice(config, input.platform, input.device);
  await installApplication(input.platform, device, path.resolve(input.artifact), config.appRoot);
  process.stdout.write(`Installed ${input.artifact} on ${device.name}.\n`);
  return 0;
}
