import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RunResult } from '../types.js';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export async function writeRunReports(result: RunResult): Promise<void> {
  await mkdir(result.artifactDirectory, { recursive: true });
  await writeFile(path.join(result.artifactDirectory, 'summary.json'), `${JSON.stringify(result, null, 2)}\n`);
  const failures = result.flows.filter((flow) => flow.status === 'failed');
  const junit = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="MobileProof ${escapeHtml(result.suite)}" tests="${result.flows.length}" failures="${failures.length}">${result.flows.map((flow) => `\n  <testcase classname="${flow.platform}" name="${escapeHtml(flow.id)}" time="${flow.durationMs / 1000}">${flow.error ? `<failure message="${escapeHtml(flow.error)}" />` : ''}</testcase>`).join('')}\n</testsuite>\n`;
  await writeFile(path.join(result.artifactDirectory, 'junit.xml'), junit);
  const rows = result.flows.map((flow) => `<tr><td>${escapeHtml(flow.id)}</td><td>${flow.platform}</td><td>${flow.status}</td><td>${flow.durationMs} ms</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>MobileProof ${escapeHtml(result.suite)}</title><style>body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:0 20px;color:#18202a}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d7dde5;padding:8px;text-align:left}.passed{color:#08783e}.failed{color:#b42318}</style></head><body><h1>MobileProof</h1><p class="${result.status}">${result.status.toUpperCase()} · ${result.coverage.level} verified</p><p>Run ${result.identity.runId} · suite ${escapeHtml(result.suite)}</p><table><thead><tr><th>Flow</th><th>Platform</th><th>Status</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  await writeFile(path.join(result.artifactDirectory, 'summary.html'), html);
  const artifactSubjects = Object.entries(result.identity.artifactHashes).map(([platform, digest]) => ({
    name: `${result.suite}-${platform}`,
    digest: { sha256: digest },
  }));
  const attestation = {
    predicateType: 'https://mobileproof.dev/attestation/v1',
    subject: artifactSubjects.length > 0 ? artifactSubjects : [{ name: `${result.suite}-source`, digest: { sha256: result.identity.sourceHash } }],
    predicate: {
      status: result.status,
      verificationLevel: result.coverage.level,
      runId: result.identity.runId,
      sourceCommit: result.identity.sourceCommit,
      configHash: result.identity.configHash,
      platforms: result.platforms,
      completedAt: result.completedAt,
      expiresAt: new Date(Date.parse(result.completedAt) + 7 * 86_400_000).toISOString(),
      signed: false,
    },
  };
  await writeFile(path.join(result.artifactDirectory, 'attestation.json'), `${JSON.stringify(attestation, null, 2)}\n`);
  await writeFile(path.join(result.artifactDirectory, 'rerun.txt'), `mobileproof run ${result.suite}\n`);
}
