import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const manifest = JSON.parse(await readFile(new URL('../packages/cli/package.json', import.meta.url), 'utf8'));
const { stdout } = await run(process.execPath, ['packages/cli/dist/cli.js', '--version'], {
  cwd: new URL('..', import.meta.url),
});

const reported = stdout.trim();
if (reported !== manifest.version) {
  throw new Error(`CLI reports ${reported}, but package.json declares ${manifest.version}`);
}

process.stdout.write(`Verified mobileproof CLI version ${reported}.\n`);
