export class ConfigError extends Error {
  readonly exitCode = 3;

  constructor(message: string, readonly details: string[] = []) {
    super(message);
    this.name = 'ConfigError';
  }
}
