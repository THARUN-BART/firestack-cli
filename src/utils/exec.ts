import { spawn, spawnSync, type SpawnSyncReturns } from 'node:child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeout?: number;
  silent?: boolean;
}

export function runCommandSync(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): ExecResult {
  try {
    const res: SpawnSyncReturns<Buffer> = spawnSync(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      timeout: options.timeout || 120000,
      encoding: 'buffer',
      shell: true,
    });

    const stdout = res.stdout ? res.stdout.toString('utf-8') : '';
    const stderr = res.stderr ? res.stderr.toString('utf-8') : '';
    const exitCode = res.status ?? (res.error ? 1 : 0);

    return { stdout, stderr, exitCode };
  } catch (err: any) {
    return {
      stdout: '',
      stderr: err.message || String(err),
      exitCode: 1,
    };
  }
}

export function runCommandAsync(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<ExecResult> {
  return new Promise((resolve) => {
    try {
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 0,
        });
      });

      child.on('error', (err) => {
        resolve({
          stdout,
          stderr: err.message || String(err),
          exitCode: 1,
        });
      });
    } catch (err: any) {
      resolve({
        stdout: '',
        stderr: err.message || String(err),
        exitCode: 1,
      });
    }
  });
}
