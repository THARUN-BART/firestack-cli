import { Command } from 'commander';
import { runSetupCommand } from './commands/setup';
import { runDoctorCommand } from './commands/doctor';
import { runFixCommand } from './commands/fix';

export function createCli(): Command {
  const program = new Command();

  program
    .name('firestack')
    .description('Universal Firebase Setup and Diagnostic CLI for Next.js, Expo, React, React Native, and Web frameworks')
    .version('1.0.0');

  program
    .command('setup', { isDefault: true })
    .description('Detect project state and configure Firebase for Web, Android, and iOS')
    .action(async () => {
      try {
        await runSetupCommand();
      } catch (err: any) {
        console.error('Setup encountered an unexpected error:', err.message || err);
        process.exit(1);
      }
    });

  program
    .command('doctor')
    .description('Inspect current Firebase setup without modifying files')
    .action(async () => {
      try {
        await runDoctorCommand();
      } catch (err: any) {
        console.error('Doctor failed:', err.message || err);
        process.exit(1);
      }
    });

  program
    .command('fix [target]')
    .description('Automatically resolve missing Firebase configuration (web, env, android, ios, deps, all)')
    .action(async (target?: string) => {
      try {
        await runFixCommand(target);
      } catch (err: any) {
        console.error('Fix failed:', err.message || err);
        process.exit(1);
      }
    });

  return program;
}

if (import.meta.main || process.argv[1]?.endsWith('cli.ts') || process.argv[1]?.endsWith('cli.js') || process.argv[1]?.endsWith('firestack.mjs') || process.argv[1]?.endsWith('firestack') || process.argv[1]?.endsWith('firestack-cli')) {
  createCli().parse(process.argv);
}

