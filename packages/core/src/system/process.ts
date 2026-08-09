import { execa } from 'execa';
import path from 'node:path';
import type { CommandConfig } from '@mobileproof/config';
import { MobileProofError } from '../errors.js';
import type { CommandResult } from '../types.js';

export async function runCommand(
  command: CommandConfig | string[],
  defaults: { cwd: string; env?: Record<string, string>; timeoutMs?: number },
): Promise<CommandResult> {
  const config: CommandConfig = Array.isArray(command) ? { argv: command } : command;
  const [executable, ...args] = config.argv;
  if (!executable) throw new MobileProofError('Command is empty', 'configuration');
  const cwd = config.cwd ? path.resolve(defaults.cwd, config.cwd) : defaults.cwd;
  const started = performance.now();
  const result = await execa(executable, args, {
    cwd,
    env: { ...defaults.env, ...config.env },
    ...((config.timeoutMs ?? defaults.timeoutMs) ? { timeout: config.timeoutMs ?? defaults.timeoutMs } : {}),
    reject: false,
    all: false,
  });
  const commandResult: CommandResult = {
    command: config.argv,
    cwd,
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
    durationMs: Math.round(performance.now() - started),
  };
  if (commandResult.exitCode !== 0 && !config.allowFailure) {
    throw new MobileProofError(
      `Command failed: ${config.argv.join(' ')}`,
      'environment',
      [commandResult.stderr || commandResult.stdout],
    );
  }
  return commandResult;
}

export interface ManagedProcess {
  stop(): Promise<string>;
}

export function startManagedProcess(command: CommandConfig, cwd: string): ManagedProcess {
  const [executable, ...args] = command.argv;
  if (!executable) throw new MobileProofError('Service command is empty', 'configuration');
  const child = execa(executable, args, {
    cwd: command.cwd ?? cwd,
    ...(command.env ? { env: command.env } : {}),
    reject: false,
    all: true,
    cleanup: true,
  });
  return {
    async stop() {
      child.kill('SIGTERM');
      const result = await Promise.race([
        child,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000)),
      ]);
      if (result === null) {
        child.kill('SIGKILL');
        const finalResult = await child;
        return finalResult.all ?? '';
      }
      return result.all ?? '';
    },
  };
}
