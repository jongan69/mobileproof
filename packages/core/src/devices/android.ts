import { MobileProofError } from '../errors.js';
import type { Device } from '../types.js';
import { runCommand } from '../system/process.js';

export function parseAdbDevices(output: string): Device[] {
  return output
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const [id, state, ...metadata] = line.split(/\s+/);
      if (!id || !state || state !== 'device') return [];
      const model = metadata.find((part) => part.startsWith('model:'))?.slice(6) ?? id;
      return [{
        id,
        platform: 'android' as const,
        name: model.replaceAll('_', ' '),
        type: id.startsWith('emulator-') ? 'emulator' as const : 'physical' as const,
        state,
      }];
    });
}

export async function discoverAndroidDevices(cwd: string): Promise<Device[]> {
  try {
    return parseAdbDevices((await runCommand(['adb', 'devices', '-l'], { cwd })).stdout);
  } catch (error) {
    throw new MobileProofError('ADB is unavailable', 'toolchain', [String(error)]);
  }
}

export function selectAndroidDevice(devices: Device[], selector: string): Device {
  const explicit = devices.find((device) => device.id === selector);
  if (explicit) return explicit;
  const selected = selector === 'connected-first'
    ? devices.find((device) => device.type === 'physical') ?? devices[0]
    : devices[0];
  if (!selected) throw new MobileProofError('No usable Android device is connected', 'device');
  return selected;
}
