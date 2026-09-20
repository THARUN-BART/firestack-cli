import path from 'node:path';
import { fileExists } from '../utils/fs';
import type { PackageManager } from '../types';

export function detectPackageManager(projectDir: string = process.cwd()): PackageManager {
  if (fileExists(path.join(projectDir, 'bun.lock')) || fileExists(path.join(projectDir, 'bun.lockb'))) {
    return 'bun';
  }
  if (fileExists(path.join(projectDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fileExists(path.join(projectDir, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fileExists(path.join(projectDir, 'package-lock.json'))) {
    return 'npm';
  }

  // Fallback: check if bun or yarn or npm is in process.env npm_config_user_agent
  const userAgent = process.env.npm_config_user_agent || '';
  if (userAgent.startsWith('bun')) return 'bun';
  if (userAgent.startsWith('pnpm')) return 'pnpm';
  if (userAgent.startsWith('yarn')) return 'yarn';

  return 'npm';
}

export function getInstallCommand(packageManager: PackageManager, packages: string[], isDev = false): string {
  const pkgs = packages.join(' ');
  switch (packageManager) {
    case 'bun':
      return `bun add ${isDev ? '-d ' : ''}${pkgs}`;
    case 'yarn':
      return `yarn add ${isDev ? '-D ' : ''}${pkgs}`;
    case 'pnpm':
      return `pnpm add ${isDev ? '-D ' : ''}${pkgs}`;
    case 'npm':
    default:
      return `npm install ${isDev ? '--save-dev ' : ''}${pkgs}`;
  }
}

export function getRunExecCommand(packageManager: PackageManager, cmd: string): string {
  switch (packageManager) {
    case 'bun':
      return `bunx ${cmd}`;
    case 'yarn':
      return `yarn dlx ${cmd}`;
    case 'pnpm':
      return `pnpm dlx ${cmd}`;
    case 'npm':
    default:
      return `npx ${cmd}`;
  }
}
