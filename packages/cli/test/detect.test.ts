import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectProject } from '../src/init/detect.js';

describe('project detection', () => {
  it('detects a standard Expo project', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'mobileproof-expo-'));
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies: { expo: '57.0.0' } }));
    await writeFile(path.join(root, 'app.json'), JSON.stringify({ expo: { ios: { bundleIdentifier: 'dev.mobileproof.ios' }, android: { package: 'dev.mobileproof.android' } } }));
    await writeFile(path.join(root, 'package-lock.json'), '{}');
    await expect(detectProject(root)).resolves.toMatchObject({ framework: 'expo', packageManager: 'npm', iosId: 'dev.mobileproof.ios', androidId: 'dev.mobileproof.android', scripts: {} });
  });
});
