import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  banner: { js: '#!/usr/bin/env node' },
  noExternal: ['@mobileproof/config', '@mobileproof/core'],
});
