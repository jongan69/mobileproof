import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Ajv2020, type ErrorObject } from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';
import { parse } from 'yaml';
import schema from '../schema/mobileproof.schema.json' with { type: 'json' };
import coverageSchema from '../schema/coverage.schema.json' with { type: 'json' };
import { ConfigError } from './errors.js';
import { interpolateEnvironment } from './interpolate.js';
import type { CoverageManifest, MobileProofConfig, ResolvedConfig } from './types.js';

export async function loadConfig(
  configPath = 'mobileproof.yaml',
  environment: NodeJS.ProcessEnv = process.env,
): Promise<ResolvedConfig> {
  const absoluteConfigPath = path.resolve(configPath);
  const directory = path.dirname(absoluteConfigPath);
  let source: string;
  try {
    source = await readFile(absoluteConfigPath, 'utf8');
  } catch (error) {
    throw new ConfigError(`Cannot read configuration: ${absoluteConfigPath}`, [String(error)]);
  }

  const parsed = interpolateEnvironment(parse(source), environment);
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const addFormats = formatsPlugin as unknown as (instance: Ajv2020) => Ajv2020;
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(parsed)) {
    const details = (validate.errors ?? []).map(
      (error: ErrorObject) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`,
    );
    throw new ConfigError('Invalid MobileProof configuration', details);
  }

  const config = parsed as unknown as MobileProofConfig;
  const workspaceRoot = path.resolve(directory, config.project.workspaceRoot);
  return {
    ...config,
    configPath: absoluteConfigPath,
    configDirectory: directory,
    workspaceRoot,
    appRoot: path.resolve(workspaceRoot, config.project.appRoot),
    artifactDirectory: path.resolve(directory, config.artifacts?.directory ?? '.mobileproof/artifacts'),
  };
}

export async function loadCoverage(config: ResolvedConfig): Promise<CoverageManifest | undefined> {
  if (!config.coverage) return undefined;
  const manifestPath = path.resolve(config.configDirectory, config.coverage.manifest);
  const parsed: unknown = parse(await readFile(manifestPath, 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const addFormats = formatsPlugin as unknown as (instance: Ajv2020) => Ajv2020;
  addFormats(ajv);
  const validate = ajv.compile(coverageSchema);
  if (!validate(parsed)) {
    throw new ConfigError(`Invalid coverage manifest: ${manifestPath}`, (validate.errors ?? []).map(
      (error: ErrorObject) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`,
    ));
  }
  return parsed as unknown as CoverageManifest;
}
