import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { configureAndroid } from '../src/config/android';
import { configureIos } from '../src/config/ios';
import { configureWeb, parseWebSdkConfig } from '../src/config/web';

describe('Platform Configurations', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-fb-cfg-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('configures Android google-services.json and updates build.gradle', () => {
    const androidAppDir = path.join(tempDir, 'android', 'app');
    fs.mkdirSync(androidAppDir, { recursive: true });

    fs.writeFileSync(
      path.join(tempDir, 'android', 'build.gradle'),
      'buildscript {\n    dependencies {\n        classpath("com.android.tools.build:gradle:8.0.0")\n    }\n}'
    );
    fs.writeFileSync(
      path.join(androidAppDir, 'build.gradle'),
      'apply plugin: "com.android.application"\n\nandroid {\n}'
    );

    const mockGoogleServicesJson = JSON.stringify({ project_info: { project_id: 'test-project' } });
    const res = configureAndroid(tempDir, mockGoogleServicesJson, false, 'com.test.app');

    expect(res.googleServicesJsonPlaced).toBe(true);
    expect(res.gradleModified).toBe(true);
    expect(fs.existsSync(path.join(androidAppDir, 'google-services.json'))).toBe(true);

    const appGradle = fs.readFileSync(path.join(androidAppDir, 'build.gradle'), 'utf-8');
    expect(appGradle).toContain("apply plugin: 'com.google.gms.google-services'");
  });

  it('configures iOS GoogleService-Info.plist in target folder', () => {
    const iosAppDir = path.join(tempDir, 'ios', 'MyApp');
    fs.mkdirSync(iosAppDir, { recursive: true });

    const mockPlist = '<?xml version="1.0" encoding="UTF-8"?>\n<plist><dict></dict></plist>';
    const res = configureIos(tempDir, mockPlist, false, 'com.test.app');

    expect(res.googleServiceInfoPlistPlaced).toBe(true);
    expect(fs.existsSync(path.join(iosAppDir, 'GoogleService-Info.plist'))).toBe(true);
  });

  it('parses Web SDK config and generates Web configuration file', () => {
    const sampleCliOutput = `
const firebaseConfig = {
  apiKey: "AIzaSyDummyKey123",
  authDomain: "my-app.firebaseapp.com",
  projectId: "my-app",
  storageBucket: "my-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
`;
    const parsed = parseWebSdkConfig(sampleCliOutput);
    expect(parsed).not.toBeNull();
    expect(parsed?.apiKey).toBe('AIzaSyDummyKey123');
    expect(parsed?.projectId).toBe('my-app');

    if (parsed) {
      const res = configureWeb(tempDir, parsed);
      expect(res.created).toBe(true);
      expect(fs.existsSync(res.filePath)).toBe(true);

      const content = fs.readFileSync(res.filePath, 'utf-8');
      expect(content).toContain("import { initializeApp, getApps, getApp } from 'firebase/app';");
      expect(content).toContain('AIzaSyDummyKey123');
    }
  });
});
