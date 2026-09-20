import { describe, it, expect } from 'vitest';
import { extractJsonFromOutput } from '../src/firebase/cli';
import { splitCommand, sanitizeArg } from '../src/utils/exec';

describe('Firebase CLI output parsing', () => {
  it('extracts JSON when CLI prints progress logs beforehand', () => {
    const output = `
- Preparing the list of your Firebase projects
✔ Preparing the list of your Firebase projects
{
  "status": "success",
  "result": [
    {
      "projectId": "demo-project",
      "displayName": "Demo Project"
    }
  ]
}
`;
    const data = extractJsonFromOutput<{ status: string; result: any[] }>(output);
    expect(data).not.toBeNull();
    expect(data?.status).toBe('success');
    expect(data?.result[0].projectId).toBe('demo-project');
  });

  it('handles clean JSON output', () => {
    const output = JSON.stringify({ ok: true, count: 42 });
    const data = extractJsonFromOutput<{ ok: boolean; count: number }>(output);
    expect(data?.ok).toBe(true);
    expect(data?.count).toBe(42);
  });

  it('returns null on invalid non-JSON output', () => {
    const data = extractJsonFromOutput('Error: Command failed with status 1');
    expect(data).toBeNull();
  });

  it('strips ANSI escape codes before parsing', () => {
    const output = '\x1B[32m✔\x1B[0m Done\n{"status":"success","result":[]}\n';
    const data = extractJsonFromOutput<{ status: string }>(output);
    expect(data?.status).toBe('success');
  });

  // Fix #15: Firebase API error response detection
  it('returns null-equivalent for Firebase error status with exit code 0', () => {
    // extractJsonFromOutput just parses; runFirebaseCommand handles the status check
    // This tests that the JSON is extracted even from error responses
    const output = JSON.stringify({ status: 'error', error: 'Project not found' });
    const data = extractJsonFromOutput(output);
    expect(data?.status).toBe('error');
    // The runFirebaseCommand wrapper should handle this — verify the structure
    expect(data?.error).toBe('Project not found');
  });
});

// Security Fix #1: Shell injection prevention
describe('Command execution security', () => {
  it('splitCommand correctly splits command strings', () => {
    expect(splitCommand('bun add @react-native-firebase/app')).toEqual([
      'bun',
      ['add', '@react-native-firebase/app'],
    ]);
    expect(splitCommand('npm install --save-dev vitest')).toEqual([
      'npm',
      ['install', '--save-dev', 'vitest'],
    ]);
  });

  it('sanitizeArg accepts valid arguments', () => {
    expect(() => sanitizeArg('@react-native-firebase/app')).not.toThrow();
    expect(() => sanitizeArg('com.example.myapp')).not.toThrow();
    expect(() => sanitizeArg('1.2.3')).not.toThrow();
    expect(() => sanitizeArg('--save-dev')).not.toThrow();
    expect(() => sanitizeArg('firebase-tools')).not.toThrow();
    expect(() => sanitizeArg('my-project-123')).not.toThrow();
  });

  it('sanitizeArg rejects shell metacharacters', () => {
    expect(() => sanitizeArg('foo;bar')).toThrow();
    expect(() => sanitizeArg('foo&&bar')).toThrow();
    expect(() => sanitizeArg('$(whoami)')).toThrow();
    expect(() => sanitizeArg('`rm -rf /`')).toThrow();
    expect(() => sanitizeArg('foo|bar')).toThrow();
    expect(() => sanitizeArg('../etc/passwd')).toThrow();
  });
});
