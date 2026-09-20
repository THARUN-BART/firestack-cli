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

  it('flags missing files and suggests fixes', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'empty-test' })
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

    const missingWeb = report.items.find(
      (i) => i.category === 'Web' && i.name === 'Firebase Web config'
    );
    expect(missingWeb?.status).toBe('fail');
    expect(missingWeb?.fixAction).toBe('rn-firebase fix web');
  });

  it('detects existing files and passes checks', () => {
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

    const webCheck = report.items.find((i) => i.name === 'Firebase Web config');
    expect(webCheck?.status).toBe('pass');
  });
});
