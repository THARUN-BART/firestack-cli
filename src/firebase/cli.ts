import { runCommandSync } from '../utils/exec';

export interface FirebaseCliResult<T = any> {
  success: boolean;
  data?: T;
  rawOutput: string;
  error?: string;
}

export function extractJsonFromOutput<T = any>(output: string): T | null {
  try {
    const firstBrace = output.indexOf('{');
    const firstBracket = output.indexOf('[');

    let startIndex = -1;
    if (firstBrace !== -1 && firstBracket !== -1) {
      startIndex = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIndex = firstBrace;
    } else if (firstBracket !== -1) {
      startIndex = firstBracket;
    }

    if (startIndex === -1) return null;

    const lastBrace = output.lastIndexOf('}');
    const lastBracket = output.lastIndexOf(']');
    const endIndex = Math.max(lastBrace, lastBracket);

    if (endIndex === -1 || endIndex < startIndex) return null;

    const jsonStr = output.slice(startIndex, endIndex + 1);
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

export function checkFirebaseCliInstalled(): { installed: boolean; version?: string } {
  const res = runCommandSync('firebase', ['--version']);
  if (res.exitCode === 0 && res.stdout.trim()) {
    return { installed: true, version: res.stdout.trim() };
  }
  return { installed: false };
}

export function runFirebaseCommand<T = any>(args: string[], cwd?: string): FirebaseCliResult<T> {
  const res = runCommandSync('firebase', args, { cwd });
  const rawOutput = (res.stdout + '\n' + res.stderr).trim();

  if (res.exitCode !== 0) {
    return {
      success: false,
      rawOutput,
      error: res.stderr || res.stdout || 'Firebase command failed',
    };
  }

  const parsed = extractJsonFromOutput<T>(rawOutput);
  return {
    success: true,
    data: parsed ?? undefined,
    rawOutput,
  };
}
