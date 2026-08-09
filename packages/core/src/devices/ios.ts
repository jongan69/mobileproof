import { MobileProofError } from '../errors.js';
import type { Device } from '../types.js';
import { runCommand } from '../system/process.js';

interface SimctlList {
  devices: Record<string, Array<{ udid: string; name: string; state: string; isAvailable?: boolean }>>;
}

interface SimctlRuntimeList {
  runtimes: Array<{ identifier: string; name: string; version: string; isAvailable?: boolean }>;
}

interface SimctlDeviceTypeList {
  devicetypes: Array<{ identifier: string; name: string }>;
}

export function parseSimctlDevices(output: string): Device[] {
  const parsed = JSON.parse(output) as SimctlList;
  return Object.entries(parsed.devices).flatMap(([runtime, devices]) =>
    devices.filter((device) => device.isAvailable !== false).map((device) => {
      const osVersion = runtime.split('.SimRuntime.')[1]?.replaceAll('-', '.');
      return {
        id: device.udid,
        platform: 'ios' as const,
        name: device.name,
        type: 'simulator' as const,
        state: device.state,
        ...(osVersion ? { osVersion } : {}),
      };
    }),
  );
}

export async function discoverIosDevices(cwd: string): Promise<Device[]> {
  try {
    const result = await runCommand(['xcrun', 'simctl', 'list', 'devices', 'available', '--json'], { cwd });
    return parseSimctlDevices(result.stdout);
  } catch (error) {
    throw new MobileProofError('Xcode Simulator tooling is unavailable', 'toolchain', [String(error)]);
  }
}

export async function selectIosDevice(devices: Device[], selector: string, cwd: string): Promise<Device> {
  const explicit = devices.find((device) => device.id === selector);
  if (explicit) return explicit;
  const booted = devices.find((device) => device.state === 'Booted');
  if (booted) return booted;
  let selected = devices[0];
  if (!selected && selector === 'booted-or-create') {
    const runtimes = JSON.parse((await runCommand(['xcrun', 'simctl', 'list', 'runtimes', '--json'], { cwd })).stdout) as SimctlRuntimeList;
    const deviceTypes = JSON.parse((await runCommand(['xcrun', 'simctl', 'list', 'devicetypes', '--json'], { cwd })).stdout) as SimctlDeviceTypeList;
    const candidates = runtimes.runtimes
      .filter((candidate) => candidate.isAvailable !== false && candidate.name.startsWith('iOS'))
      .sort((left, right) => right.version.localeCompare(left.version, undefined, { numeric: true }));
    const deviceType = deviceTypes.devicetypes.find((candidate) => candidate.name === 'iPhone 16 Pro')
      ?? deviceTypes.devicetypes.find((candidate) => candidate.name.startsWith('iPhone'));
    if (candidates.length === 0 || !deviceType) throw new MobileProofError('No compatible iOS Simulator runtime/device type is installed', 'device');
    const failures: string[] = [];
    for (const runtime of candidates) {
      try {
        const id = (await runCommand(['xcrun', 'simctl', 'create', 'MobileProof iPhone', deviceType.identifier, runtime.identifier], { cwd })).stdout.trim();
        selected = { id, platform: 'ios', name: 'MobileProof iPhone', type: 'simulator', state: 'Shutdown', osVersion: runtime.version };
        break;
      } catch (error) {
        failures.push(`${runtime.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (!selected) throw new MobileProofError('Unable to create an iOS Simulator', 'device', failures);
  }
  if (!selected) throw new MobileProofError('No available iOS Simulator exists', 'device');
  if (selector === 'booted-or-create') {
    await runCommand(['xcrun', 'simctl', 'boot', selected.id], { cwd });
    return { ...selected, state: 'Booted' };
  }
  throw new MobileProofError('No iOS Simulator is booted', 'device');
}
