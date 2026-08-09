import type { Platform, ResolvedConfig } from '@mobileproof/config';
import {
  discoverAndroidDevices,
  discoverIosDevices,
  selectAndroidDevice,
  selectIosDevice,
  type Device,
} from '@mobileproof/core';

export async function resolveDevice(config: ResolvedConfig, platform: Platform, explicit?: string): Promise<Device> {
  const selector = explicit ?? config.devices[platform]?.selector;
  if (!selector) throw new Error(`Missing ${platform} device selector`);
  if (platform === 'android') return selectAndroidDevice(await discoverAndroidDevices(config.appRoot), selector);
  return selectIosDevice(await discoverIosDevices(config.appRoot), selector, config.appRoot);
}
