import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execa } from 'execa';

const MAESTRO = {
  version: '2.8.0',
  url: 'https://github.com/mobile-dev-inc/Maestro/releases/download/cli-2.8.0/maestro.zip',
  sha256: 'b3e561161904fb391875ca5834d5b22cf0b01c052dd1b408ad83e30d8f8951b3',
};

export async function installToolchain(): Promise<number> {
  const cacheRoot = process.env.MOBILEPROOF_CACHE_DIR ?? path.join(os.homedir(), '.cache', 'mobileproof');
  const target = path.join(cacheRoot, 'toolchains', 'maestro', MAESTRO.version);
  const zipPath = path.join(target, 'maestro.zip');
  await mkdir(target, { recursive: true });
  let archive: Buffer | undefined;
  try { archive = await readFile(zipPath); } catch { /* Download below. */ }
  let digest = archive ? createHash('sha256').update(archive).digest('hex') : '';
  if (digest !== MAESTRO.sha256) {
    process.stdout.write(`Downloading Maestro ${MAESTRO.version}…\n`);
    const response = await fetch(MAESTRO.url);
    if (!response.ok) throw new Error(`Maestro download failed: ${response.status}`);
    archive = Buffer.from(await response.arrayBuffer());
    digest = createHash('sha256').update(archive).digest('hex');
    if (digest !== MAESTRO.sha256) throw new Error(`Maestro checksum mismatch: ${digest}`);
    await writeFile(zipPath, archive, { mode: 0o600 });
  }
  process.stdout.write('Checksum verified; extracting…\n');
  if (process.platform === 'win32') {
    await execa('powershell', ['-NoProfile', '-Command', 'Expand-Archive', '-LiteralPath', zipPath, '-DestinationPath', target, '-Force']);
  } else {
    await execa('unzip', ['-q', '-o', zipPath, '-d', target]);
  }
  const executable = path.join(target, 'maestro', 'bin', 'maestro');
  await chmod(executable, 0o755);
  process.stdout.write(`Installed Maestro ${MAESTRO.version}.\nSet MOBILEPROOF_MAESTRO=${executable}\n`);
  return 0;
}

export function printToolchain(): void {
  process.stdout.write(`MobileProof supports Maestro ${MAESTRO.version}. Run \`mobileproof toolchain install\` for a checksum-verified local copy.\n`);
}
