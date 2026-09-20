import { runCommandSync } from '../utils/exec';

export interface FirebaseCliResult<T = any> {
  success: boolean;
  data?: T;
  rawOutput: string;
  error?: string;
}

/**
 * Fix #3: Extract JSON from Firebase CLI output more robustly.
 * Firebase CLI prints spinner progress lines before the JSON block.
 * Instead of greedily grabbing from first { to last }, we try to find
 * a top-level JSON object/array by iterating forward once we find the
 * start of a JSON token.
 */
export function extractJsonFromOutput<T = any>(output: string): T | null {
  // Strip ANSI escape codes that some Firebase CLI versions emit
  const cleaned = output.replace(/\x1B\[[0-9;]*m/g, '');

  // Scan lines to find the first line that starts a JSON block
  const lines = cleaned.split('\n');
  let jsonStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      jsonStart = i;
      break;
    }
  }

  if (jsonStart === -1) return null;

  // Attempt to parse from the detected start line onwards,
  // progressively adding lines until parse succeeds or we run out.
  const candidateLines = lines.slice(jsonStart);
  for (let end = candidateLines.length; end >= 1; end--) {
    try {
      const candidate = candidateLines.slice(0, end).join('\n');
      const parsed = JSON.parse(candidate) as T;
      return parsed;
    } catch {
      // Try a shorter slice
    }
  }

  return null;
}

export function checkFirebaseCliInstalled(): { installed: boolean; version?: string } {
  // Use shell: false via runCommandSync — firebase --version is safe (no user input)
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

  const parsed = extractJsonFromOutput<any>(rawOutput);

  // Fix #15: Also treat Firebase API-level errors (exit 0 but status: "error") as failures
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const asRecord = parsed as Record<string, any>;
    if (asRecord.status === 'error') {
      return {
        success: false,
        rawOutput,
        error: asRecord.error || asRecord.message || 'Firebase command returned an error status',
      };
    }
  }

  return {
    success: true,
    data: (parsed as T) ?? undefined,
    rawOutput,
  };
}
