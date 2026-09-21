import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateEnvVariables, writeFrameworkEnvFile } from '../src/config/env';
import type { FirebaseWebConfig } from '../types';

describe('Environment Variable Management', () => {
  let tempDir: string;

  const mockConfig: FirebaseWebConfig = {
    apiKey: 'AIzaSy123456789',
    authDomain: 'my-project.firebaseapp.com',
    projectId: 'my-project',
    storageBucket: 'my-project.appspot.com',
    messagingSenderId: '987654321',
    appId: '1:987654321:web:abcdef',
    measurementId: 'G-MEASURE123',
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-fb-env-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('generates environment variables with Next.js prefix (NEXT_PUBLIC_)', () => {
    const vars = generateEnvVariables(mockConfig, 'NEXT_PUBLIC_');
    expect(vars['NEXT_PUBLIC_FIREBASE_API_KEY']).toBe('AIzaSy123456789');
    expect(vars['NEXT_PUBLIC_FIREBASE_PROJECT_ID']).toBe('my-project');
    expect(vars['NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID']).toBe('G-MEASURE123');
  });

  it('generates environment variables with Vite prefix (VITE_)', () => {
    const vars = generateEnvVariables(mockConfig, 'VITE_');
    expect(vars['VITE_FIREBASE_API_KEY']).toBe('AIzaSy123456789');
    expect(vars['VITE_FIREBASE_AUTH_DOMAIN']).toBe('my-project.firebaseapp.com');
  });

  it('generates environment variables with Expo prefix (EXPO_PUBLIC_)', () => {
    const vars = generateEnvVariables(mockConfig, 'EXPO_PUBLIC_');
    expect(vars['EXPO_PUBLIC_FIREBASE_API_KEY']).toBe('AIzaSy123456789');
  });

  it('writes a new .env.local file cleanly', () => {
    const res = writeFrameworkEnvFile(tempDir, mockConfig, 'NEXT_PUBLIC_', '.env.local');
    expect(res.created).toBe(true);
    expect(fs.existsSync(res.envFilePath)).toBe(true);

    const content = fs.readFileSync(res.envFilePath, 'utf-8');
    expect(content).toContain('NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy123456789"');
    expect(content).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID="my-project"');
  });

  it('preserves existing non-Firebase environment variables when updating', () => {
    const envFile = path.join(tempDir, '.env');
    fs.writeFileSync(envFile, 'DATABASE_URL="postgres://localhost:5432"\nSECRET_KEY="mysecret"\n');

    const res = writeFrameworkEnvFile(tempDir, mockConfig, 'VITE_', '.env');
    expect(res.updated).toBe(true);

    const content = fs.readFileSync(envFile, 'utf-8');
    expect(content).toContain('DATABASE_URL="postgres://localhost:5432"');
    expect(content).toContain('SECRET_KEY="mysecret"');
    expect(content).toContain('VITE_FIREBASE_API_KEY="AIzaSy123456789"');
  });

  it('updates existing Firebase variables without creating duplicate keys', () => {
    const envFile = path.join(tempDir, '.env.local');
    fs.writeFileSync(
      envFile,
      'NEXT_PUBLIC_FIREBASE_API_KEY="OLD_KEY"\nOTHER_VAR="value"\n'
    );

    const res = writeFrameworkEnvFile(tempDir, mockConfig, 'NEXT_PUBLIC_', '.env.local');
    expect(res.updated).toBe(true);

    const content = fs.readFileSync(envFile, 'utf-8');
    expect(content).toContain('NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy123456789"');
    expect(content).not.toContain('OLD_KEY');
    expect(content).toContain('OTHER_VAR="value"');

    // Count occurrences of key
    const matches = content.match(/NEXT_PUBLIC_FIREBASE_API_KEY/g);
    expect(matches?.length).toBe(1);
  });
});
