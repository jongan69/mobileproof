import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { scaffoldProject } from '../src/init/scaffold.js';

describe('project scaffold', () => {
  it('creates a strict, non-destructive Expo smoke workspace', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'mobileproof-scaffold-'));
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies: { expo: '57.0.0' }, scripts: { lint: 'expo lint' } }));
    await writeFile(path.join(root, 'app.json'), JSON.stringify({ expo: { android: { package: 'dev.mobileproof.fixture' } } }));
    await writeFile(path.join(root, 'package-lock.json'), '{}');
    await scaffoldProject({ root, readyId: 'screen.home.ready', dryRun: false, force: false });
    const config = parse(await readFile(path.join(root, 'mobileproof.yaml'), 'utf8')) as { checks: Array<{ id: string }>; app: { android: { id: string } } };
    const flow = await readFile(path.join(root, 'e2e/mobileproof/flows/cold-launch.yaml'), 'utf8');
    expect(config.app.android.id).toBe('dev.mobileproof.fixture');
    expect(config.checks.map((check) => check.id)).toEqual(['lint']);
    expect(flow).toContain('screen.home.ready');
    expect(flow).not.toContain('clearState');
    await expect(scaffoldProject({ root, readyId: 'screen.home.ready', dryRun: false, force: false })).rejects.toThrow('overwrite');
  });
});
