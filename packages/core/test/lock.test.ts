import { describe, expect, it } from 'vitest';
import { acquireDeviceLock } from '../src/index.js';

describe('device locks', () => {
  it('prevents concurrent use and releases the exact device lock', async () => {
    const device = `test-device-${Date.now()}`;
    const first = await acquireDeviceLock(device, 'first');
    await expect(acquireDeviceLock(device, 'second')).rejects.toThrow('locked');
    await first.release();
    const second = await acquireDeviceLock(device, 'second');
    await second.release();
  });
});
