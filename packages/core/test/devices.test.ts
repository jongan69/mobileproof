import { describe, expect, it } from 'vitest';
import { parseAdbDevices, parseSimctlDevices, selectAndroidDevice } from '../src/index.js';

describe('device discovery', () => {
  it('prefers a physical Android device', () => {
    const devices = parseAdbDevices(`List of devices attached\nemulator-5554 device product:sdk model:Pixel_8\nR5CT device product:e3q model:Galaxy_S24\n`);
    expect(selectAndroidDevice(devices, 'connected-first').id).toBe('R5CT');
  });

  it('parses available iOS simulators', () => {
    const devices = parseSimctlDevices(JSON.stringify({ devices: {
      'com.apple.CoreSimulator.SimRuntime.iOS-18-5': [
        { udid: 'ABC', name: 'iPhone 16', state: 'Booted', isAvailable: true },
      ],
    } }));
    expect(devices[0]).toMatchObject({ id: 'ABC', osVersion: 'iOS.18.5', state: 'Booted' });
  });
});
