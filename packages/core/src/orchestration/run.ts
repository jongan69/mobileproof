import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { FlowConfig, Platform } from '@mobileproof/config';
import { loadCoverage } from '@mobileproof/config';
import { buildAndInstall } from '../adapters/build.js';
import { loadAdapter } from '../adapters/load.js';
import { discoverAndroidDevices, selectAndroidDevice } from '../devices/android.js';
import { discoverIosDevices, selectIosDevice } from '../devices/ios.js';
import { acquireDeviceLock, type DeviceLock } from '../devices/lock.js';
import { evaluateCoverage } from '../evidence/coverage.js';
import { MobileProofError } from '../errors.js';
import { writeRunReports } from '../reporting/report.js';
import { Redactor } from '../security/redactor.js';
import { createRunId, sha256 } from '../system/hash.js';
import { hashInstalledApplication } from '../system/artifact.js';
import { runCommand, startManagedProcess, type ManagedProcess } from '../system/process.js';
import { inspectSource } from '../system/source.js';
import type { CheckResult, Device, FlowContext, FlowResult, RunContext, RunIdentity, RunOptions, RunResult } from '../types.js';

async function waitForHealth(url: string, timeoutMs: number, intervalMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(Math.min(intervalMs, 5_000)) });
      if (response.ok) return;
    } catch {
      // Retry until the bounded deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new MobileProofError(`Service health check timed out: ${url}`, 'environment');
}

async function selectDevice(platform: Platform, selector: string, cwd: string): Promise<Device> {
  if (platform === 'android') return selectAndroidDevice(await discoverAndroidDevices(cwd), selector);
  return selectIosDevice(await discoverIosDevices(cwd), selector, cwd);
}

async function executeFlow(input: {
  flow: FlowConfig;
  platform: Platform;
  device: Device;
  appId: string;
  configDirectory: string;
  artifactDirectory: string;
  variables: Record<string, string>;
}): Promise<FlowResult> {
  const flowDirectory = path.join(input.artifactDirectory, 'flows', `${input.platform}-${input.flow.id}`);
  await mkdir(flowDirectory, { recursive: true });
  const flowPath = path.resolve(input.configDirectory, input.flow.path);
  const junitPath = path.join(flowDirectory, 'maestro-junit.xml');
  const args = [
    process.env.MOBILEPROOF_MAESTRO ?? 'maestro', `--device=${input.device.id}`, 'test', flowPath,
    '--format=JUNIT', `--output=${junitPath}`, `--test-output-dir=${flowDirectory}`,
    '-e', `APP_ID=${input.appId}`,
  ];
  for (const [key, value] of Object.entries({ ...input.flow.env, ...input.variables })) args.push('-e', `${key}=${value}`);
  const started = performance.now();
  try {
    await runCommand({ argv: args, timeoutMs: input.flow.timeoutMs ?? 300_000 }, { cwd: input.configDirectory });
    return {
      id: input.flow.id,
      platform: input.platform,
      status: 'passed',
      durationMs: Math.round(performance.now() - started),
      ...(input.flow.scenario ? { scenario: input.flow.scenario } : {}),
      assertions: [],
      artifactDirectory: flowDirectory,
    };
  } catch (error) {
    return {
      id: input.flow.id,
      platform: input.platform,
      status: 'failed',
      durationMs: Math.round(performance.now() - started),
      ...(input.flow.scenario ? { scenario: input.flow.scenario } : {}),
      assertions: [],
      error: error instanceof Error ? error.message : String(error),
      artifactDirectory: flowDirectory,
    };
  }
}

export async function runSuite(options: RunOptions): Promise<RunResult> {
  const { config, logger } = options;
  const suite = config.suites[options.suite];
  if (!suite) throw new MobileProofError(`Unknown suite: ${options.suite}`, 'configuration');
  const profile = config.build[suite.buildProfile];
  if (!profile) throw new MobileProofError(`Unknown build profile: ${suite.buildProfile}`, 'configuration');
  const platforms = options.platforms ?? suite.platforms ?? (Object.keys(config.app) as Platform[]);
  if (platforms.length === 0) throw new MobileProofError('No platforms selected', 'configuration');
  const runId = createRunId();
  const artifactDirectory = path.join(config.artifactDirectory, runId);
  await mkdir(artifactDirectory, { recursive: true });
  const source = await inspectSource(config.workspaceRoot);
  const configContents = await readFile(config.configPath, 'utf8');
  const verificationInputs: string[] = [configContents];
  const inputPaths = [
    ...(config.coverage ? [path.resolve(config.configDirectory, config.coverage.manifest)] : []),
    ...suite.flows.map((flow) => path.resolve(config.configDirectory, flow.path)),
    ...(config.adapter ? [path.resolve(config.configDirectory, config.adapter)] : []),
  ];
  for (const inputPath of inputPaths.sort()) {
    verificationInputs.push(inputPath, await readFile(inputPath, 'utf8'));
  }
  const identity: RunIdentity = {
    runId,
    startedAt: new Date().toISOString(),
    sourceCommit: source.commit,
    dirty: source.dirty,
    sourceHash: source.hash,
    configHash: sha256(verificationInputs.join('\0')),
    artifactHashes: {},
  };
  const redactor = new Redactor(config.redaction?.patterns);
  for (const name of config.redaction?.secretsFromEnvironment ?? []) {
    const value = process.env[name];
    if (value) redactor.register(value);
  }
  const context: RunContext = {
    runId,
    config,
    artifactDirectory,
    log: (message) => logger.info(redactor.redact(message)),
    registerSecret: (secret) => redactor.register(secret),
    exec: (argv, commandOptions = {}) => runCommand(argv, {
      cwd: commandOptions.cwd ?? config.appRoot,
      ...(commandOptions.env ? { env: commandOptions.env } : {}),
      ...(commandOptions.timeoutMs ? { timeoutMs: commandOptions.timeoutMs } : {}),
    }),
  };
  const adapter = await loadAdapter(config.adapter, config.configDirectory);
  const managedServices: ManagedProcess[] = [];
  const deviceLocks: DeviceLock[] = [];
  const checks: CheckResult[] = [];
  const flows: FlowResult[] = [];
  const devices: Device[] = [];
  let primaryError: unknown;
  try {
    await adapter.prepare?.(context);
    for (const service of config.services ?? []) {
      if (service.suites && !service.suites.includes(options.suite)) continue;
      logger.info(`Starting service ${service.id}`);
      managedServices.push(startManagedProcess(service.start, config.appRoot));
      if (service.health) await waitForHealth(service.health.url, service.health.timeoutMs ?? 60_000, service.health.intervalMs ?? 500);
    }
    const requestedChecks = new Set(suite.checks ?? []);
    for (const check of config.checks ?? []) {
      if (requestedChecks.size > 0 && !requestedChecks.has(check.id)) continue;
      if (check.suites && !check.suites.includes(options.suite)) continue;
      const started = performance.now();
      try {
        await runCommand(check.command, { cwd: config.appRoot });
        checks.push({ id: check.id, status: 'passed', durationMs: Math.round(performance.now() - started) });
      } catch (error) {
        checks.push({ id: check.id, status: 'failed', durationMs: Math.round(performance.now() - started), error: String(error) });
      }
    }
    for (const platform of platforms) {
      const target = config.devices[platform];
      const appId = config.app[platform]?.id;
      if (!target || !appId) throw new MobileProofError(`Missing ${platform} target configuration`, 'configuration');
      const requestedDevice = options.deviceIds?.[platform];
      const device = await selectDevice(platform, requestedDevice ?? target.selector, config.appRoot);
      deviceLocks.push(await acquireDeviceLock(device.id, runId));
      devices.push(device);
      await buildAndInstall({
        config,
        profile,
        platform,
        device,
        skipBuild: options.skipBuild ?? false,
        logger,
        fingerprint: sha256(`${source.hash}:${identity.configHash}:${suite.buildProfile}:${platform}`),
      });
      try {
        identity.artifactHashes[platform] = await hashInstalledApplication(platform, device, appId, config.appRoot);
      } catch (error) {
        if (options.strict ?? suite.strict) throw new MobileProofError(`Could not hash the installed ${platform} artifact`, 'build', [String(error)]);
        logger.warn(`Installed artifact hash unavailable for ${platform}`);
      }
      for (const flow of suite.flows) {
        if (options.flowIds && !options.flowIds.includes(flow.id)) continue;
        if (flow.platforms && !flow.platforms.includes(platform)) continue;
        logger.info(`Running ${flow.id} on ${device.name}`);
        const flowContext: FlowContext = { ...context, flowId: flow.id, platform, device };
        const scenario = flow.scenario ? await adapter.seed?.(flowContext, flow.scenario) : undefined;
        for (const secret of scenario?.secrets ?? []) redactor.register(secret);
        const result = await executeFlow({
          flow,
          platform,
          device,
          appId,
          configDirectory: config.configDirectory,
          artifactDirectory,
          variables: scenario?.variables ?? {},
        });
        for (const assertion of flow.assertions ?? []) {
          const assertionResult = await adapter.assert?.(flowContext, assertion);
          if (!assertionResult) {
            result.status = 'failed';
            result.error = `Adapter does not implement assertion: ${assertion}`;
          } else if (!assertionResult.passed) {
            result.status = 'failed';
            result.error = assertionResult.message ?? `Assertion failed: ${assertion}`;
          } else {
            result.assertions.push(assertion);
          }
        }
        flows.push(result);
      }
    }
  } catch (error) {
    primaryError = error;
    logger.error(error instanceof Error ? error.message : String(error));
  } finally {
    try { await adapter.cleanup?.(context); } catch (error) { logger.warn(`Adapter cleanup failed: ${String(error)}`); }
    const serviceOutputs = await Promise.allSettled(managedServices.map((service) => service.stop()));
    const serviceLog = serviceOutputs.map((output) => output.status === 'fulfilled' ? output.value : String(output.reason)).join('\n');
    if (serviceLog) await writeFile(path.join(artifactDirectory, 'services.log'), redactor.redact(serviceLog));
    await Promise.allSettled(deviceLocks.map((lock) => lock.release()));
  }
  const coverage = evaluateCoverage({
    manifest: await loadCoverage(config),
    checks,
    flows,
    strict: options.strict ?? suite.strict ?? false,
    platforms,
  });
  const artifactFiles: string[] = [];
  async function collectFiles(directory: string): Promise<void> {
    const { readdir } = await import('node:fs/promises');
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await collectFiles(absolute);
      else artifactFiles.push(absolute);
    }
  }
  await collectFiles(artifactDirectory);
  const privacyFindings = (await Promise.all(artifactFiles.map((file) => redactor.scanFile(file)))).flat();
  const status = !primaryError
    && checks.every((check) => check.status === 'passed')
    && flows.length > 0
    && flows.every((flow) => flow.status === 'passed')
    && coverage.passed
    && (!(options.strict ?? suite.strict) || privacyFindings.length === 0)
    ? 'passed' as const : 'failed' as const;
  const result: RunResult = {
    identity,
    suite: options.suite,
    strict: options.strict ?? suite.strict ?? false,
    status,
    platforms,
    devices,
    checks,
    flows,
    coverage,
    privacyFindings,
    artifactDirectory,
    completedAt: new Date().toISOString(),
  };
  await writeRunReports(result);
  await writeFile(path.join(artifactDirectory, 'environment.json'), `${JSON.stringify({ node: process.version, platform: process.platform, devices }, null, 2)}\n`);
  return result;
}
