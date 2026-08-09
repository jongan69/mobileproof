export type ErrorCategory =
  | 'test'
  | 'configuration'
  | 'toolchain'
  | 'device'
  | 'build'
  | 'environment'
  | 'coverage'
  | 'privacy'
  | 'internal';

export const EXIT_CODES: Record<ErrorCategory, number> = {
  test: 2,
  configuration: 3,
  toolchain: 4,
  device: 5,
  build: 6,
  environment: 7,
  coverage: 8,
  privacy: 9,
  internal: 1,
};

export class MobileProofError extends Error {
  readonly exitCode: number;

  constructor(
    message: string,
    readonly category: ErrorCategory,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'MobileProofError';
    this.exitCode = EXIT_CODES[category];
  }
}
