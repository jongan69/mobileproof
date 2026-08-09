import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function hashFile(filePath: string): Promise<string> {
  return sha256(await readFile(filePath));
}

export function createRunId(date = new Date()): string {
  const timestamp = date.toISOString().replaceAll(/[-:.TZ]/g, '').slice(0, 14);
  return `${timestamp}-${randomBytes(5).toString('hex')}`;
}
