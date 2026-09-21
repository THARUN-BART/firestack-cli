import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectFramework } from '../src/detection/framework';
import { detectProject } from '../src/detection/project';

describe('Multi-Framework Detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-fb-fw-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects Next.js with App Router', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'my-next-app', dependencies: { next: '^14.0.0', react: '^18.0.0' } })
    );
    fs.mkdirSync(path.join(tempDir, 'app'), { recursive: true });

    const result = detectFramework(tempDir, { next: '^14.0.0', react: '^18.0.0' });
    expect(result.framework).toBe('nextjs');
    expect(result.routerType).toBe('app');
    expect(result.envPrefix).toBe('NEXT_PUBLIC_');
    expect(result.envFileName).toBe('.env.local');
    expect(result.isWebFramework).toBe(true);

    const project = detectProject(tempDir);
    expect(project.framework).toBe('nextjs');
    expect(project.envPrefix).toBe('NEXT_PUBLIC_');
  });

  it('detects Next.js with Pages Router in src/pages', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'my-next-pages-app', dependencies: { next: '^14.0.0' } })
    );
    fs.mkdirSync(path.join(tempDir, 'src', 'pages'), { recursive: true });

    const result = detectFramework(tempDir, { next: '^14.0.0' });
    expect(result.framework).toBe('nextjs');
    expect(result.routerType).toBe('pages');
    expect(result.envPrefix).toBe('NEXT_PUBLIC_');
  });

  it('detects React + Vite project', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'my-vite-app', dependencies: { react: '^18.0.0', vite: '^5.0.0' } })
    );
    fs.writeFileSync(path.join(tempDir, 'vite.config.ts'), 'export default {}');

    const result = detectFramework(tempDir, { react: '^18.0.0', vite: '^5.0.0' });
    expect(result.framework).toBe('vite');
    expect(result.frameworkDisplayName).toBe('React (Vite)');
    expect(result.envPrefix).toBe('VITE_');
    expect(result.isWebFramework).toBe(true);
  });

  it('detects Expo project with Expo Router', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'my-expo-app',
        dependencies: { expo: '^51.0.0', 'expo-router': '^3.5.0', 'react-native': '0.74.0' },
      })
    );
    fs.writeFileSync(path.join(tempDir, 'app.json'), JSON.stringify({ expo: { name: 'App' } }));

    const result = detectFramework(tempDir, {
      expo: '^51.0.0',
      'expo-router': '^3.5.0',
      'react-native': '0.74.0',
    });
    expect(result.framework).toBe('expo');
    expect(result.routerType).toBe('expo-router');
    expect(result.envPrefix).toBe('EXPO_PUBLIC_');
    expect(result.isExpo).toBe(true);
  });

  it('detects Remix project', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'my-remix-app', dependencies: { '@remix-run/react': '^2.0.0' } })
    );

    const result = detectFramework(tempDir, { '@remix-run/react': '^2.0.0' });
    expect(result.framework).toBe('remix');
    expect(result.isWebFramework).toBe(true);
  });

  it('detects Create React App', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'my-cra-app', dependencies: { 'react-scripts': '5.0.0' } })
    );

    const result = detectFramework(tempDir, { 'react-scripts': '5.0.0' });
    expect(result.framework).toBe('cra');
    expect(result.envPrefix).toBe('REACT_APP_');
  });

  it('detects TypeScript project presence', () => {
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'ts-app', dependencies: { react: '^18.0.0' } })
    );

    const result = detectFramework(tempDir, { react: '^18.0.0' });
    expect(result.isTypeScript).toBe(true);
  });
});
