import { describe, it, expect } from 'vitest';
import { extractJsonFromOutput } from '../src/firebase/cli';

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
});
