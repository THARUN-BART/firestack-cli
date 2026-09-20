import { runCommandSync } from '../utils/exec';
import { getRunExecCommand } from '../detection/package-manager';
import type { PackageManager } from '../types';

export interface PrebuildResult {
  success: boolean;
  message: string;
}

export function runExpoPrebuild(
  projectDir: string,
  packageManager: PackageManager,
  clean = false
): PrebuildResult {
  const baseCmd = getRunExecCommand(packageManager, 'expo prebuild --no-install' + (clean ? ' --clean' : ''));
  const res = runCommandSync(baseCmd, [], { cwd: projectDir });

  if (res.exitCode === 0) {
    return {
      success: true,
      message: 'Expo prebuild completed successfully.',
    };
  }

  return {
    success: false,
    message: res.stderr || res.stdout || 'Expo prebuild failed.',
  };
}
