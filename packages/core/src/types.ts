import type { Platform, ResolvedConfig } from '@mobileproof/config';

export interface Device {
  id: string;
  platform: Platform;
  name: string;
  type: 'simulator' | 'emulator' | 'physical';
  state: string;
  osVersion?: string;
}

export interface CommandResult {
  command: string[];
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface RunIdentity {
  runId: string;
  startedAt: string;
  sourceCommit: string | null;
  dirty: boolean;
  sourceHash: string;
  configHash: string;
  artifactHashes: Partial<Record<Platform, string>>;
}

export interface FlowResult {
  id: string;
  platform: Platform;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  scenario?: string;
  assertions: string[];
  error?: string;
  artifactDirectory: string;
}

export interface CheckResult {
  id: string;
  status: 'passed' | 'failed';
  durationMs: number;
  error?: string;
}

export interface CoverageResult {
  level: 'smoke' | 'capability' | 'release' | 'none';
  passed: boolean;
  satisfied: string[];
  blocked: Array<{ capability: string; reason: string }>;
}

export interface PrivacyFinding {
  file: string;
  detector: string;
  line?: number;
}

export interface RunResult {
  identity: RunIdentity;
  suite: string;
  strict: boolean;
  status: 'passed' | 'failed';
  platforms: Platform[];
  devices: Device[];
  checks: CheckResult[];
  flows: FlowResult[];
  coverage: CoverageResult;
  privacyFindings: PrivacyFinding[];
  artifactDirectory: string;
  completedAt: string;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export interface RunOptions {
  config: ResolvedConfig;
  suite: string;
  platforms?: Platform[];
  deviceIds?: Partial<Record<Platform, string>>;
  skipBuild?: boolean;
  strict?: boolean;
  flowIds?: string[];
  logger: Logger;
}

export interface RunContext {
  runId: string;
  config: ResolvedConfig;
  artifactDirectory: string;
  log(message: string): void;
  registerSecret(secret: string): void;
  exec(argv: string[], options?: { cwd?: string; env?: Record<string, string>; timeoutMs?: number }): Promise<CommandResult>;
}

export interface FlowContext extends RunContext {
  flowId: string;
  platform: Platform;
  device: Device;
}

export interface ScenarioResult {
  variables?: Record<string, string>;
  secrets?: string[];
}

export interface AssertionResult {
  passed: boolean;
  message?: string;
}

export interface MobileProofAdapterV1 {
  apiVersion: 1;
  prepare?(context: RunContext): Promise<void>;
  seed?(context: FlowContext, scenario: string): Promise<ScenarioResult>;
  setFault?(context: FlowContext, fault: string, enabled: boolean): Promise<void>;
  assert?(context: FlowContext, assertion: string): Promise<AssertionResult>;
  cleanup?(context: RunContext): Promise<void>;
}
