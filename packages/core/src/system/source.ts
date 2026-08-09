import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { runCommand } from './process.js';
import { sha256 } from './hash.js';

export async function inspectSource(root: string): Promise<{
  commit: string | null;
  dirty: boolean;
  hash: string;
}> {
  let commit: string | null = null;
  let dirty = false;
  try {
    commit = (await runCommand(['git', 'rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    const status = (await runCommand(['git', 'status', '--porcelain'], { cwd: root })).stdout;
    dirty = status.length > 0;
    const diff = (await runCommand(['git', 'diff', '--binary', 'HEAD'], { cwd: root })).stdout;
    const untracked = (await runCommand(['git', 'ls-files', '--others', '--exclude-standard'], { cwd: root })).stdout
      .split('\n').filter(Boolean).sort();
    const untrackedContents: string[] = [];
    for (const file of untracked) {
      const contents = await readFile(path.join(root, file));
      untrackedContents.push(file, contents.toString('base64'));
    }
    return { commit, dirty, hash: sha256([commit, diff, ...untrackedContents].join('\0')) };
  } catch {
    // Non-git projects receive a content fingerprint.
  }
  const candidates = await fg(
    ['**/*'],
    { cwd: root, onlyFiles: true, dot: true, ignore: ['**/node_modules/**', '**/.git/**', '**/.mobileproof/**', '**/dist/**', '**/build/**', '**/coverage/**'] },
  );
  const chunks: string[] = [];
  for (const candidate of candidates.sort()) {
    const absolute = path.join(root, candidate);
    chunks.push(candidate, (await readFile(absolute)).toString('base64'));
  }
  return { commit, dirty, hash: sha256(chunks.join('\0')) };
}
