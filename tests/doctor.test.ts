import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runDoctorChecks } from '../src/commands/doctor';

describe('Doctor Checks', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-fb-doc-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('flags missing files and suggests fixes for Expo / React Native projects', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'expo-test', dependencies: { expo: '51.0.0' } })
    );

    const report = runDoctorChecks(tempDir);
    expect(report.hasFailures).toBe(true);

    const missingAndroid = report.items.find(
      (i) => i.category === 'Android' && i.name === 'google-services.json'
    );
    expect(missingAndroid?.status).toBe('fail');
    expect(missingAndroid?.fixAction).toBe('rn-firebase fix android');

    const missingIos = report.items.find(
      (i) => i.category === 'iOS' && i.name === 'GoogleService-Info.plist'
    );
    expect(missingIos?.status).toBe('fail');
    expect(missingIos?.fixAction).toBe('rn-firebase fix ios');
  });

  it('detects existing files and passes checks for healthy Expo project', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'healthy-app',
        dependencies: {
          expo: '^51.0.0',
          '@react-native-firebase/app': '^20.0.0',
        },
      })
    );
    fs.writeFileSync(
      path.join(tempDir, 'app.json'),
      JSON.stringify({
        expo: {
          name: 'Healthy',
          slug: 'healthy',
          android: {
            package: 'com.healthy.app',
            googleServicesFile: './google-services.json',
          },
          ios: {
            bundleIdentifier: 'com.healthy.app',
            googleServicesFile: './GoogleService-Info.plist',
          },
        },
      })
    );
    fs.writeFileSync(path.join(tempDir, 'google-services.json'), '{}');
    fs.writeFileSync(path.join(tempDir, 'GoogleService-Info.plist'), '<plist></plist>');
    fs.writeFileSync(path.join(tempDir, 'firebaseConfig.ts'), 'export const app = {};');

    const report = runDoctorChecks(tempDir);

    const androidCheck = report.items.find((i) => i.name === 'google-services.json');
    expect(androidCheck?.status).toBe('pass');

    const iosCheck = report.items.find((i) => i.name === 'GoogleService-Info.plist');
    expect(iosCheck?.status).toBe('pass');
  });

  it('runs web-specific checks for Next.js and Vite projects', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'my-nextjs-app',
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
          firebase: '^10.0.0',
        },
      })
    );
    fs.writeFileSync(path.join(tempDir, '.env.local'), 'NEXT_PUBLIC_FIREBASE_API_KEY="key"');
    fs.mkdirSync(path.join(tempDir, 'src', 'lib'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'lib', 'firebase.ts'), 'export const app = {};');

    const report = runDoctorChecks(tempDir);

    const envCheck = report.items.find((i) => i.category === 'Environment');
    expect(envCheck?.status).toBe('pass');

    const webCheck = report.items.find((i) => i.category === 'Web');
    expect(webCheck?.status).toBe('pass');

    const depCheck = report.items.find((i) => i.name === 'firebase (JS SDK)');
    expect(depCheck?.status).toBe('pass');
  });
});
