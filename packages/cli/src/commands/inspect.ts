import { loadConfig } from '@mobileproof/config';
import { discoverAndroidDevices, discoverIosDevices } from '@mobileproof/core';

export async function inspectCommand(configPath: string): Promise<void> {
  const config = await loadConfig(configPath);
  const output: Record<string, unknown> = {
    config: config.configPath,
    workspaceRoot: config.workspaceRoot,
    appRoot: config.appRoot,
    suites: Object.keys(config.suites),
  };
  if (config.app.android) output.androidDevices = await discoverAndroidDevices(config.appRoot).catch(() => []);
  if (config.app.ios) output.iosDevices = await discoverIosDevices(config.appRoot).catch(() => []);
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
