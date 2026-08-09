export type Platform = 'ios' | 'android';
export type PackageManager = 'auto' | 'npm' | 'yarn' | 'pnpm' | 'bun';

export interface CommandConfig {
  argv: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  allowFailure?: boolean;
}

export interface BuildProfile {
  strategy: 'auto' | 'expo-run' | 'eas-local' | 'native' | 'custom' | 'installed';
  mode: 'debug' | 'release';
  isolation?: 'project' | 'clean-copy';
  command?: CommandConfig;
  artifact?: string;
}

export interface FlowConfig {
  id: string;
  path: string;
  scenario?: string;
  assertions?: string[];
  platforms?: Platform[];
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface SuiteConfig {
  buildProfile: string;
  strict?: boolean;
  platforms?: Platform[];
  flows: FlowConfig[];
  checks?: string[];
}

export interface MobileProofConfig {
  schemaVersion: 1;
  project: {
    workspaceRoot: string;
    appRoot: string;
    framework?: 'auto' | 'expo' | 'react-native';
    packageManager?: PackageManager;
  };
  app: Partial<Record<Platform, { id: string }>>;
  build: Record<string, BuildProfile>;
  devices: Partial<Record<Platform, {
    type: 'simulator' | 'emulator' | 'physical' | 'any';
    selector: string;
    create?: boolean;
  }>>;
  checks?: Array<{ id: string; command: CommandConfig; suites?: string[] }>;
  services?: Array<{
    id: string;
    start: CommandConfig;
    health?: { url: string; timeoutMs?: number; intervalMs?: number };
    suites?: string[];
  }>;
  suites: Record<string, SuiteConfig>;
  coverage?: { manifest: string };
  artifacts?: { directory?: string; retentionDays?: number };
  redaction?: { secretsFromEnvironment?: string[]; patterns?: string[] };
  adapter?: string;
}

export interface ResolvedConfig extends MobileProofConfig {
  configPath: string;
  configDirectory: string;
  workspaceRoot: string;
  appRoot: string;
  artifactDirectory: string;
}

export type EvidenceType = 'maestro' | 'check' | 'assertion' | 'manual';

export interface Capability {
  applicable: boolean;
  releaseCritical?: boolean;
  platforms?: Platform[];
  evidence?: Array<{ type: EvidenceType; id: string }>;
  reason?: string;
  owner?: string;
  reviewAfter?: string;
}

export interface CoverageManifest {
  schemaVersion: 1;
  capabilities: Record<string, Capability>;
}
