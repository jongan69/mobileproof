import { mkdir, open, readFile, unlink, type FileHandle } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MobileProofError } from '../errors.js';
import { sha256 } from '../system/hash.js';

export interface DeviceLock {
  release(): Promise<void>;
}

function isProcessAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export async function acquireDeviceLock(deviceId: string, runId: string): Promise<DeviceLock> {
  const directory = path.join(os.tmpdir(), 'mobileproof-device-locks');
  await mkdir(directory, { recursive: true });
  const lockPath = path.join(directory, `${sha256(deviceId).slice(0, 24)}.lock`);
  let handle: FileHandle;
  try {
    handle = await open(lockPath, 'wx', 0o600);
  } catch {
    let stale = false;
    try {
      const current = JSON.parse(await readFile(lockPath, 'utf8')) as { pid?: number };
      stale = typeof current.pid === 'number' && !isProcessAlive(current.pid);
    } catch {
      stale = true;
    }
    if (!stale) throw new MobileProofError(`Device is locked by another MobileProof run: ${deviceId}`, 'device');
    await unlink(lockPath).catch(() => undefined);
    handle = await open(lockPath, 'wx', 0o600);
  }
  await handle.writeFile(`${JSON.stringify({ pid: process.pid, runId, deviceId, createdAt: new Date().toISOString() })}\n`);
  return {
    async release() {
      await handle.close().catch(() => undefined);
      await unlink(lockPath).catch(() => undefined);
    },
  };
}
