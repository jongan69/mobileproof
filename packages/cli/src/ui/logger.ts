import type { Logger } from '@mobileproof/core';

const colors = process.stdout.isTTY ? {
  blue: '\u001B[34m', yellow: '\u001B[33m', red: '\u001B[31m', gray: '\u001B[90m', reset: '\u001B[0m',
} : { blue: '', yellow: '', red: '', gray: '', reset: '' };

export const terminalLogger: Logger = {
  info(message) { process.stdout.write(`${colors.blue}●${colors.reset} ${message}\n`); },
  warn(message) { process.stderr.write(`${colors.yellow}▲${colors.reset} ${message}\n`); },
  error(message) { process.stderr.write(`${colors.red}✖${colors.reset} ${message}\n`); },
  debug(message) { if (process.env.MOBILEPROOF_DEBUG === '1') process.stderr.write(`${colors.gray}${message}${colors.reset}\n`); },
};
