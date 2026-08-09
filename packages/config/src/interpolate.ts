import { ConfigError } from './errors.js';

const ENV_PATTERN = /\$\{([A-Z][A-Z0-9_]*)\}/g;

export function interpolateEnvironment(value: unknown, environment: NodeJS.ProcessEnv): unknown {
  if (typeof value === 'string') {
    return value.replace(ENV_PATTERN, (_match, name: string) => {
      const replacement = environment[name];
      if (replacement === undefined) {
        throw new ConfigError(`Missing required environment variable: ${name}`);
      }
      return replacement;
    });
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolateEnvironment(item, environment));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, interpolateEnvironment(child, environment)]),
    );
  }
  return value;
}
