import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectPackageManager, getInstallCommand } from '../src/detection/package-manager';
import { detectPlatforms } from '../src/detection/platforms';
import { detectDependencies } from '../src/detection/dependencies';
import { detectProject } from '../src/detection/project';

describe('Project Detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-fb-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('detects package managers correctly based on lockfiles', () => {
    fs.writeFileSync(path.join(tempDir, 'bun.lock'), '');
    expect(detectPackageManager(tempDir)).toBe('bun');

    fs.unlinkSync(path.join(tempDir, 'bun.lock'));
    fs.writeFileSync(path.join(tempDir, 'yarn.lock'), '');
    expect(detectPackageManager(tempDir)).toBe('yarn');

    fs.unlinkSync(path.join(tempDir, 'yarn.lock'));
    fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), '');
    expect(detectPackageManager(tempDir)).toBe('pnpm');

    fs.unlinkSync(path.join(tempDir, 'pnpm-lock.yaml'));
    fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '');
    expect(detectPackageManager(tempDir)).toBe('npm');
  });

  it('formats install commands per package manager', () => {
    expect(getInstallCommand('bun', ['@react-native-firebase/app'])).toBe('bun add @react-native-firebase/app');
    expect(getInstallCommand('npm', ['@react-native-firebase/app'])).toBe('npm install @react-native-firebase/app');
    expect(getInstallCommand('yarn', ['@react-native-firebase/app'])).toBe('yarn add @react-native-firebase/app');
    expect(getInstallCommand('pnpm', ['@react-native-firebase/app'])).toBe('pnpm add @react-native-firebase/app');
  });

  it('detects Expo project from app.json and expo dependency', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'my-expo-app',
        dependencies: { expo: '^51.0.0', 'react-native': '0.74.0' },
      })
    );
    fs.writeFileSync(
      path.join(tempDir, 'app.json'),
      JSON.stringify({
        expo: {
          name: 'My Expo App',
          slug: 'my-expo-app',
          android: { package: 'com.test.expoapp' },
          ios: { bundleIdentifier: 'com.test.expoapp' },
        },
      })
    );

    const project = detectProject(tempDir);
    expect(project.isExpo).toBe(true);
    expect(project.isBareReactNative).toBe(false);
    expect(project.androidPackageName).toBe('com.test.expoapp');
    expect(project.iosBundleId).toBe('com.test.expoapp');
  });

  it('detects bare React Native project and extracts IDs from android/ios', () => {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'my-bare-app',
        dependencies: { 'react-native': '0.74.0' },
      })
    );

    const androidAppDir = path.join(tempDir, 'android', 'app');
    fs.mkdirSync(androidAppDir, { recursive: true });
    fs.writeFileSync(
      path.join(androidAppDir, 'build.gradle'),
      'android {\n    namespace "com.bare.myapp"\n    defaultConfig {\n        applicationId "com.bare.myapp"\n    }\n}'
    );

    const project = detectProject(tempDir);
    expect(project.isExpo).toBe(false);
    expect(project.isBareReactNative).toBe(true);
    expect(project.hasAndroid).toBe(true);
    expect(project.androidPackageName).toBe('com.bare.myapp');
  });
});
