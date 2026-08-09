import { describe, expect, it } from 'vitest';
import { Redactor } from '../src/index.js';

describe('redaction', () => {
  it('redacts registered and known secret shapes', () => {
    const redactor = new Redactor();
    redactor.register('super-secret');
    expect(redactor.redact('value=super-secret')).toBe('value=[REDACTED]');
    expect(redactor.redact('Authorization: Bearer abcdefghijklmnop')).toBe('[REDACTED]');
  });
});
