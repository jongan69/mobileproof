import { readFile } from 'node:fs/promises';
import type { PrivacyFinding } from '../types.js';

interface Detector {
  name: string;
  expression: RegExp;
}

const BUILT_IN_DETECTORS: Detector[] = [
  { name: 'authorization-header', expression: /authorization:\s*(?:bearer|basic)\s+[a-z0-9._~+/=-]{8,}/gi },
  { name: 'jwt', expression: /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/g },
  { name: 'nostr-private-key', expression: /\bnsec1[023456789acdefghjklmnpqrstuvwxyz]{20,}\b/gi },
  { name: 'generic-private-key', expression: /-----BEGIN (?:EC |RSA )?PRIVATE KEY-----/g },
];

function escapeExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class Redactor {
  private readonly secrets = new Set<string>();
  private readonly detectors: Detector[];

  constructor(patterns: string[] = []) {
    this.detectors = [
      ...BUILT_IN_DETECTORS,
      ...patterns.map((pattern, index) => ({ name: `custom-${index + 1}`, expression: new RegExp(pattern, 'g') })),
    ];
  }

  register(secret: string): void {
    if (secret.length >= 4) this.secrets.add(secret);
  }

  redact(value: string): string {
    let output = value;
    for (const secret of this.secrets) output = output.replace(new RegExp(escapeExpression(secret), 'g'), '[REDACTED]');
    for (const detector of this.detectors) output = output.replace(detector.expression, '[REDACTED]');
    return output;
  }

  async scanFile(filePath: string): Promise<PrivacyFinding[]> {
    let contents: string;
    try {
      contents = await readFile(filePath, 'utf8');
    } catch {
      return [];
    }
    const findings: PrivacyFinding[] = [];
    const lines = contents.split('\n');
    lines.forEach((line, lineIndex) => {
      for (const detector of this.detectors) {
        detector.expression.lastIndex = 0;
        if (detector.expression.test(line)) findings.push({ file: filePath, detector: detector.name, line: lineIndex + 1 });
      }
      for (const secret of this.secrets) {
        if (line.includes(secret)) findings.push({ file: filePath, detector: 'registered-secret', line: lineIndex + 1 });
      }
    });
    return findings;
  }
}
