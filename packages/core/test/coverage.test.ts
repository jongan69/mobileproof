import { describe, expect, it } from 'vitest';
import { evaluateCoverage } from '../src/index.js';

describe('coverage evidence', () => {
  it('grants release verification only when strict evidence passes', () => {
    const result = evaluateCoverage({
      manifest: {
        schemaVersion: 1,
        capabilities: {
          'lifecycle.launch': {
            applicable: true,
            releaseCritical: true,
            platforms: ['android'],
            evidence: [{ type: 'maestro', id: 'cold-launch' }],
          },
        },
      },
      checks: [],
      flows: [{ id: 'cold-launch', platform: 'android', status: 'passed', durationMs: 1, assertions: [], artifactDirectory: '/tmp' }],
      strict: true,
      platforms: ['android'],
    });
    expect(result).toMatchObject({ passed: true, level: 'release' });
  });

  it('rejects stale exclusions', () => {
    const result = evaluateCoverage({
      manifest: { schemaVersion: 1, capabilities: {
        purchases: { applicable: false, reason: 'No purchases', owner: 'team', reviewAfter: '2025-01-01' },
      } },
      checks: [],
      flows: [],
      strict: true,
      platforms: ['ios'],
      now: new Date('2026-01-01'),
    });
    expect(result.passed).toBe(false);
  });
});
