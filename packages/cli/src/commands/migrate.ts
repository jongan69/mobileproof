import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { parse, stringify } from 'yaml';
import { scaffoldProject } from '../init/scaffold.js';

export async function migrateMaestro(input: { root: string; from: string; dryRun: boolean; force: boolean; readyId: string }): Promise<number> {
  const root = path.resolve(input.root);
  const from = path.resolve(root, input.from);
  const paths = await fg(['**/*.yaml', '**/*.yml'], { cwd: from, onlyFiles: true, ignore: ['config.yaml', '**/config.yaml'] });
  if (paths.length === 0) throw new Error(`No Maestro flows found in ${from}`);
  if (input.dryRun) {
    process.stdout.write(`${paths.map((flow) => `would import ${path.join(from, flow)}`).join('\n')}\n`);
    return 0;
  }
  await scaffoldProject({ root, readyId: input.readyId, dryRun: false, force: input.force });
  const configPath = path.join(root, 'mobileproof.yaml');
  const config = parse(await readFile(configPath, 'utf8')) as { suites: Record<string, { flows: Array<{ id: string; path: string }> }> };
  const imported = paths.map((flow) => ({
    id: path.basename(flow).replace(/\.(?:yaml|yml)$/, '').replaceAll(/[^a-zA-Z0-9._-]/g, '-'),
    path: path.relative(root, path.join(from, flow)),
  }));
  config.suites.smoke!.flows = imported;
  config.suites.release!.flows = imported;
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, stringify(config));
  process.stdout.write(`Imported ${imported.length} Maestro flows. Review capability evidence before strict verification.\n`);
  return 0;
}
