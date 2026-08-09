import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { URL } from 'node:url';

const policy = JSON.parse(await readFile(new URL('../security/audit-exceptions.json', import.meta.url), 'utf8'));
const production = spawnSync('pnpm', ['audit', '--prod', '--json'], { encoding: 'utf8' });
const productionReport = JSON.parse(production.stdout || '{}');
if ((productionReport.metadata?.vulnerabilities?.total ?? 0) > 0) {
  console.error('Production dependency audit contains vulnerabilities.');
  process.exit(1);
}

const full = spawnSync('pnpm', ['audit', '--json'], { encoding: 'utf8' });
const report = JSON.parse(full.stdout || '{}');
const advisories = Object.values(report.advisories ?? {});
const today = new Date();
const failures = [];
for (const advisory of advisories) {
  const id = advisory.github_advisory_id ?? advisory.url?.split('/').pop();
  const exception = policy.exceptions.find((candidate) => candidate.advisory === id && candidate.package === advisory.module_name);
  if (!exception) failures.push(`${id ?? advisory.id}: ${advisory.module_name} has no reviewed exception`);
  else if (new Date(exception.expires) < today) failures.push(`${id}: exception expired ${exception.expires}`);
  else if (advisory.severity !== exception.severity) failures.push(`${id}: severity changed from ${exception.severity} to ${advisory.severity}`);
}
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Production audit clean; ${advisories.length} reviewed development exception(s).`);
