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

/**
 * Split a full command string (e.g. "bun add foo") into [command, ...args]
 * so we can use shell: false and avoid shell injection.
 */
export function splitCommand(commandLine: string): [string, string[]] {
  const parts = commandLine.trim().split(/\s+/);
  if (parts.length === 0) {
    throw new Error(`Empty command: "${commandLine}"`);
  }
  return [parts[0], parts.slice(1)];
}

/**
 * Sanitize a single argument to prevent shell injection when shell mode
 * must be used (version checks, etc.). Strips characters that are shell
 * metacharacters.
 */
export function sanitizeArg(arg: string): string {
  // Allow only safe characters in individual args: alphanumerics, dots,
  // hyphens, underscores, colons, slashes, @, =, commas
  if (/[^a-zA-Z0-9.\-_:/@=,]/.test(arg)) {
    throw new Error(`Potentially unsafe argument rejected: "${arg}"`);
  }
  // Reject path traversal sequences
  if (arg.includes('..')) {
    throw new Error(`Path traversal in argument rejected: "${arg}"`);
  }
  // Reject leading slash (absolute paths)
  if (arg.startsWith('/')) {
    throw new Error(`Absolute path in argument rejected: "${arg}"`);
  }
  return arg;
}

export function runCommandSync(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): ExecResult {
  try {
    // Validate every individual argument for safety
    args.forEach((arg) => sanitizeArg(arg));

    const res: SpawnSyncReturns<Buffer> = spawnSync(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      timeout: options.timeout || 120000,
      encoding: 'buffer',
      // shell: false is the secure default — avoids shell injection
      shell: false,
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

/**
 * Run a full command string like "bun add foo bar". Splits into command + args
 * and executes with shell: false to prevent injection.
 */
export function runCommandStringSync(
  commandLine: string,
  options: ExecOptions = {}
): ExecResult {
  try {
    const [command, args] = splitCommand(commandLine);
    return runCommandSync(command, args, options);
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
      // Validate args for safety
      args.forEach((arg) => sanitizeArg(arg));

      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        shell: false,
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
