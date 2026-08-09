import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  banner: { js: '#!/usr/bin/env node' },
  define: { MOBILEPROOF_VERSION: JSON.stringify(packageJson.version) },
  noExternal: ['@mobileproof/config', '@mobileproof/core'],
});
