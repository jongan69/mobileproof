import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspectSource, runCommand } from '../src/index.js';

describe('source evidence', () => {
  it('invalidates the source hash for tracked and untracked changes', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'mobileproof-source-'));
    await runCommand(['git', 'init'], { cwd: root });
    await writeFile(path.join(root, 'package.json'), '{}');
    await runCommand(['git', 'add', 'package.json'], { cwd: root });
    await runCommand(['git', '-c', 'user.name=MobileProof', '-c', 'user.email=tests@mobileproof.dev', 'commit', '-m', 'fixture'], { cwd: root });
    const clean = await inspectSource(root);
    await writeFile(path.join(root, 'new-file.ts'), 'export const changed = true;\n');
    const dirty = await inspectSource(root);
    expect(clean.dirty).toBe(false);
    expect(dirty.dirty).toBe(true);
    expect(dirty.hash).not.toBe(clean.hash);
  });
});
