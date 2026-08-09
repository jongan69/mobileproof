import { loadConfig, loadCoverage } from '@mobileproof/config';

export async function coverageCommand(configPath: string): Promise<number> {
  const config = await loadConfig(configPath);
  const manifest = await loadCoverage(config);
  if (!manifest) {
    process.stderr.write('No coverage manifest is configured.\n');
    return 8;
  }
  const flows = new Set(Object.values(config.suites).flatMap((suite) => suite.flows.map((flow) => flow.id)));
  const checks = new Set((config.checks ?? []).map((check) => check.id));
  const failures: string[] = [];
  for (const [id, capability] of Object.entries(manifest.capabilities)) {
    if (!capability.applicable) {
      if (!capability.reason || !capability.owner || !capability.reviewAfter) failures.push(`${id}: exclusion requires reason, owner, and reviewAfter`);
      continue;
    }
    if (!capability.evidence?.length) failures.push(`${id}: applicable capability has no evidence`);
    for (const evidence of capability.evidence ?? []) {
      if (evidence.type === 'maestro' && !flows.has(evidence.id)) failures.push(`${id}: unknown flow ${evidence.id}`);
      if (evidence.type === 'check' && !checks.has(evidence.id)) failures.push(`${id}: unknown check ${evidence.id}`);
      if (evidence.type === 'manual' && capability.releaseCritical) failures.push(`${id}: release-critical evidence cannot be manual-only`);
    }
  }
  if (failures.length > 0) {
    for (const failure of failures) process.stderr.write(`✖ ${failure}\n`);
    return 8;
  }
  process.stdout.write(`✓ ${Object.keys(manifest.capabilities).length} capabilities have valid evidence references.\n`);
  return 0;
}
