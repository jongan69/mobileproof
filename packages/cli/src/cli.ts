import { Command, Option } from 'commander';
import { ConfigError } from '@mobileproof/config';
import { MobileProofError } from '@mobileproof/core';
import type { Platform } from '@mobileproof/config';
import { cleanCommand } from './commands/clean.js';
import { buildCommand } from './commands/build.js';
import { attestCommand, openArtifactsCommand, resolveRun } from './commands/artifacts.js';
import { coverageCommand } from './commands/coverage.js';
import { doctorCommand } from './commands/doctor.js';
import { installCommand } from './commands/install.js';
import { inspectCommand } from './commands/inspect.js';
import { migrateMaestro } from './commands/migrate.js';
import { runCommand } from './commands/run.js';
import { installToolchain, printToolchain } from './commands/toolchain.js';
import { scaffoldProject } from './init/scaffold.js';

const program = new Command()
  .name('mobileproof')
  .description('Auditable local verification for React Native applications')
  .version('0.1.0')
  .showSuggestionAfterError();

program.command('init')
  .description('Detect a React Native project and create a safe verification workspace')
  .option('--root <path>', 'application root', '.')
  .option('--ready-id <id>', 'stable testID proving initial readiness', 'app.ready')
  .option('--dry-run', 'print proposed files without writing')
  .option('--force', 'replace existing MobileProof scaffold files')
  .action(async (options: { root: string; readyId: string; dryRun?: boolean; force?: boolean }) => {
    const files = await scaffoldProject({ root: options.root, readyId: options.readyId, dryRun: options.dryRun ?? false, force: options.force ?? false });
    for (const file of files) process.stdout.write(`${options.dryRun ? 'would create' : 'created'} ${file.path}\n`);
    if (!options.dryRun) process.stdout.write('Add the configured readiness testID, then run `mobileproof doctor`.\n');
  });

program.command('doctor')
  .description('Validate the local toolchain, project, and target platforms')
  .option('-c, --config <path>', 'configuration file', 'mobileproof.yaml')
  .addOption(new Option('-p, --platform <platform>').choices(['ios', 'android']))
  .action(async (options: { config: string; platform?: Platform }) => { process.exitCode = await doctorCommand(options.config, options.platform); });

program.command('inspect')
  .description('Print resolved configuration and available devices')
  .option('-c, --config <path>', 'configuration file', 'mobileproof.yaml')
  .action(async (options: { config: string }) => inspectCommand(options.config));

program.command('run')
  .description('Run a configured verification suite')
  .argument('[suite]', 'suite name', 'smoke')
  .option('-c, --config <path>', 'configuration file', 'mobileproof.yaml')
  .addOption(new Option('-p, --platform <platform>').choices(['ios', 'android']))
  .option('-d, --device <id>', 'device identifier')
  .option('--skip-build', 'use an already installed application')
  .option('--strict', 'require complete evidence and clean privacy scan')
  .option('--flow <id...>', 'run only the listed flow IDs')
  .action(async (suite: string, options: { config: string; platform?: Platform; device?: string; skipBuild?: boolean; strict?: boolean; flow?: string[] }) => {
    process.exitCode = await runCommand({ suite, ...options, ...(options.flow ? { flowIds: options.flow } : {}) });
  });

program.command('build')
  .description('Build and install one configured profile')
  .argument('[profile]', 'build profile', 'smoke')
  .addOption(new Option('-p, --platform <platform>', 'target platform').choices(['ios', 'android']).makeOptionMandatory())
  .option('-c, --config <path>', 'configuration file', 'mobileproof.yaml')
  .option('-d, --device <id>', 'device identifier')
  .action(async (profile: string, options: { platform: Platform; config: string; device?: string }) => {
    process.exitCode = await buildCommand({ profile, ...options });
  });

program.command('install')
  .description('Install a prebuilt APK or iOS Simulator application')
  .argument('<artifact>', 'artifact path')
  .addOption(new Option('-p, --platform <platform>', 'target platform').choices(['ios', 'android']).makeOptionMandatory())
  .option('-c, --config <path>', 'configuration file', 'mobileproof.yaml')
  .option('-d, --device <id>', 'device identifier')
  .action(async (artifact: string, options: { platform: Platform; config: string; device?: string }) => {
    process.exitCode = await installCommand({ artifact, ...options });
  });

program.command('rerun')
  .description('Rerun failed flows from a prior run')
  .argument('<run-id>', 'prior run ID')
  .option('-c, --config <path>', 'configuration file', 'mobileproof.yaml')
  .action(async (runId: string, options: { config: string }) => {
    const prior = await resolveRun(options.config, runId);
    if (prior.failedFlows.length === 0) {
      process.stdout.write('The selected run has no failed flows.\n');
      return;
    }
    let exitCode = 0;
    for (const platform of prior.platforms) {
      exitCode = Math.max(exitCode, await runCommand({ config: options.config, suite: prior.suite, platform, flowIds: prior.failedFlows }));
    }
    process.exitCode = exitCode;
  });

program.command('clean')
  .description('Remove expired MobileProof artifacts')
  .option('-c, --config <path>', 'configuration file', 'mobileproof.yaml')
  .option('--all', 'remove all artifacts')
  .action(async (options: { config: string; all?: boolean }) => { process.exitCode = await cleanCommand(options.config, options.all ?? false); });

const coverage = program.command('coverage').description('Validate the declared evidence contract');
coverage.command('check')
  .option('-c, --config <path>', 'configuration file', 'mobileproof.yaml')
  .action(async (options: { config: string }) => { process.exitCode = await coverageCommand(options.config); });

program.command('attest')
  .description('Print a run attestation')
  .argument('[run-id]', 'run ID; defaults to latest')
  .option('-c, --config <path>', 'configuration file', 'mobileproof.yaml')
  .action(async (runId: string | undefined, options: { config: string }) => { process.exitCode = await attestCommand(options.config, runId); });

const artifacts = program.command('artifacts').description('Inspect MobileProof artifacts');
artifacts.command('open')
  .argument('[run-id]', 'run ID; defaults to latest')
  .option('-c, --config <path>', 'configuration file', 'mobileproof.yaml')
  .action(async (runId: string | undefined, options: { config: string }) => { process.exitCode = await openArtifactsCommand(options.config, runId); });

const toolchain = program.command('toolchain').description('Manage the compatible Maestro toolchain');
toolchain.action(printToolchain);
toolchain.command('install').action(async () => { process.exitCode = await installToolchain(); });

const migrate = program.command('migrate').description('Adopt an existing test workspace');
migrate.command('maestro')
  .option('--root <path>', 'application root', '.')
  .option('--from <path>', 'existing Maestro directory', '.maestro')
  .option('--ready-id <id>', 'fallback readiness ID', 'app.ready')
  .option('--dry-run', 'show discovered flows without writing')
  .option('--force', 'replace existing MobileProof scaffold files')
  .action(async (options: { root: string; from: string; readyId: string; dryRun?: boolean; force?: boolean }) => {
    process.exitCode = await migrateMaestro({ ...options, dryRun: options.dryRun ?? false, force: options.force ?? false });
  });

async function main(): Promise<void> {
  try {
    await program.parseAsync();
  } catch (error) {
    if (error instanceof MobileProofError || error instanceof ConfigError) {
      process.stderr.write(`MobileProof: ${error.message}\n`);
      for (const detail of error.details) process.stderr.write(`  ${detail}\n`);
      process.exitCode = error.exitCode;
      return;
    }
    throw error;
  }
}

void main();
