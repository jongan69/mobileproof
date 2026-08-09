import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigError, interpolateEnvironment, loadConfig } from '../src/index.js';

const VALID_CONFIG = `
schemaVersion: 1
project:
  workspaceRoot: .
  appRoot: .
  framework: auto
app:
  android:
    id: com.example.e2e
build:
  smoke:
    strategy: installed
    mode: debug
devices:
  android:
    type: any
    selector: connected-first
suites:
  smoke:
    buildProfile: smoke
    flows:
      - id: launch
        path: e2e/launch.yaml
`;

describe('configuration', () => {
  it('loads and resolves project paths', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'mobileproof-config-'));
    const configPath = path.join(directory, 'mobileproof.yaml');
    await writeFile(configPath, VALID_CONFIG);
    const config = await loadConfig(configPath);
    expect(config.appRoot).toBe(directory);
    expect(config.suites.smoke?.flows[0]?.id).toBe('launch');
  });

  it('rejects unknown fields', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'mobileproof-config-'));
    const configPath = path.join(directory, 'mobileproof.yaml');
    await writeFile(configPath, `${VALID_CONFIG}\nunknown: true\n`);
    await expect(loadConfig(configPath)).rejects.toBeInstanceOf(ConfigError);
  });

  it('interpolates explicit environment variables and rejects missing values', () => {
    expect(interpolateEnvironment('${TOKEN}', { TOKEN: 'safe' })).toBe('safe');
    expect(() => interpolateEnvironment('${MISSING}', {})).toThrow(ConfigError);
  });
});
