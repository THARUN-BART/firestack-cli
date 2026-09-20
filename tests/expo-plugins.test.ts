import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { updateExpoConfig } from '../src/expo/plugins';

describe('Expo Plugins and Config', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-fb-expo-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('adds @react-native-firebase/app plugin and googleServicesFile config', () => {
    const initialAppJson = {
      expo: {
        name: 'Demo App',
        slug: 'demo-app',
      },
    };
    fs.writeFileSync(path.join(tempDir, 'app.json'), JSON.stringify(initialAppJson, null, 2));

    const res = updateExpoConfig(tempDir, {
      packageName: 'com.demo.app',
      bundleIdentifier: 'com.demo.app',
      configureAndroidServicesFile: true,
      configureIosServicesFile: true,
      addFirebasePlugin: true,
    });

    expect(res.updated).toBe(true);

    const updated = JSON.parse(fs.readFileSync(path.join(tempDir, 'app.json'), 'utf-8'));
    expect(updated.expo.android.package).toBe('com.demo.app');
    expect(updated.expo.android.googleServicesFile).toBe('./google-services.json');
    expect(updated.expo.ios.bundleIdentifier).toBe('com.demo.app');
    expect(updated.expo.ios.googleServicesFile).toBe('./GoogleService-Info.plist');
    expect(updated.expo.plugins).toContain('@react-native-firebase/app');
  });

  it('does not duplicate @react-native-firebase/app plugin if already present', () => {
    const initialAppJson = {
      expo: {
        name: 'Demo App',
        slug: 'demo-app',
        plugins: ['@react-native-firebase/app'],
      },
    };
    fs.writeFileSync(path.join(tempDir, 'app.json'), JSON.stringify(initialAppJson, null, 2));

    updateExpoConfig(tempDir, { addFirebasePlugin: true });

    const updated = JSON.parse(fs.readFileSync(path.join(tempDir, 'app.json'), 'utf-8'));
    expect(updated.expo.plugins.filter((p: string) => p === '@react-native-firebase/app').length).toBe(1);
  });
});
