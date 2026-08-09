import type { CoverageManifest, EvidenceType, Platform } from '@mobileproof/config';
import type { CheckResult, CoverageResult, FlowResult } from '../types.js';

export function evaluateCoverage(input: {
  manifest: CoverageManifest | undefined;
  checks: CheckResult[];
  flows: FlowResult[];
  strict: boolean;
  platforms: Platform[];
  now?: Date;
}): CoverageResult {
  if (!input.manifest) {
    const smokePassed = input.flows.length > 0 && input.flows.every((flow) => flow.status === 'passed');
    return { level: smokePassed ? 'smoke' : 'none', passed: smokePassed, satisfied: [], blocked: [] };
  }
  const now = input.now ?? new Date();
  const satisfied: string[] = [];
  const blocked: CoverageResult['blocked'] = [];
  const passedEvidence = new Set<string>();
  for (const check of input.checks) if (check.status === 'passed') passedEvidence.add(`check:${check.id}`);
  for (const flow of input.flows) {
    if (flow.status !== 'passed') continue;
    passedEvidence.add(`maestro:${flow.id}`);
    for (const assertion of flow.assertions) passedEvidence.add(`assertion:${assertion}`);
  }

  for (const [id, capability] of Object.entries(input.manifest.capabilities)) {
    if (!capability.applicable) {
      if (!capability.reason || !capability.owner || !capability.reviewAfter) {
        blocked.push({ capability: id, reason: 'Exclusion requires reason, owner, and reviewAfter' });
      } else if (new Date(capability.reviewAfter) < now) {
        blocked.push({ capability: id, reason: 'Exclusion review is expired' });
      } else {
        satisfied.push(id);
      }
      continue;
    }
    const requiredPlatforms = capability.platforms ?? input.platforms;
    const missingPlatform = capability.releaseCritical && requiredPlatforms.some(
      (platform) => !input.platforms.includes(platform),
    );
    if (missingPlatform) {
      blocked.push({ capability: id, reason: 'Required platform was not executed' });
      continue;
    }
    const evidence = capability.evidence ?? [];
    const evidencePassed = evidence.length > 0 && evidence.every(
      (item: { type: EvidenceType; id: string }) => item.type !== 'manual' && passedEvidence.has(`${item.type}:${item.id}`),
    );
    if (!evidencePassed) blocked.push({ capability: id, reason: 'Required automated evidence did not pass' });
    else satisfied.push(id);
  }

  const criticalBlocked = blocked.some(({ capability }) => input.manifest?.capabilities[capability]?.releaseCritical);
  const passed = input.strict ? blocked.length === 0 : !criticalBlocked;
  return {
    level: passed ? (input.strict ? 'release' : 'capability') : 'none',
    passed,
    satisfied,
    blocked,
  };
}
