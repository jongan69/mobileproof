import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from '@mobileproof/config';

export async function cleanCommand(configPath: string, all: boolean): Promise<number> {
  const config = await loadConfig(configPath);
  const retentionMs = (config.artifacts?.retentionDays ?? 14) * 86_400_000;
  let removed = 0;
  for (const entry of await readdir(config.artifactDirectory).catch(() => [])) {
    const target = path.join(config.artifactDirectory, entry);
    const metadata = await stat(target);
    if (all || Date.now() - metadata.mtimeMs > retentionMs) {
      await rm(target, { recursive: true });
      removed += 1;
    }
  }
  process.stdout.write(`Removed ${removed} artifact director${removed === 1 ? 'y' : 'ies'}.\n`);
  return 0;
}
