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

  // Fix #4: Gradle regex scoping
  it('inserts classpath only inside buildscript dependencies, not project dependencies', () => {
    const androidDir = path.join(tempDir, 'android');
    const androidAppDir = path.join(androidDir, 'app');
    fs.mkdirSync(androidAppDir, { recursive: true });

    // Build.gradle with both buildscript and project-level dependencies blocks
    const rootGradle = `buildscript {
    dependencies {
        classpath("com.android.tools.build:gradle:8.0.0")
    }
}

dependencies {
    implementation("some.other:lib:1.0.0")
}`;
    fs.writeFileSync(path.join(androidDir, 'build.gradle'), rootGradle);
    fs.writeFileSync(path.join(androidAppDir, 'build.gradle'), 'apply plugin: "com.android.application"\n');

    const mockJson = JSON.stringify({ project_info: { project_id: 'test' } });
    configureAndroid(tempDir, mockJson, false);

    const updatedRoot = fs.readFileSync(path.join(androidDir, 'build.gradle'), 'utf-8');
    // Should contain google-services classpath
    expect(updatedRoot).toContain('com.google.gms:google-services');
    // The project-level dependencies block should be unchanged (no classpath insertion there)
    const projectDepsMatch = updatedRoot.match(/dependencies\s*\{[\s\S]*?implementation\(["']some.other:lib:1\.0\.0["']\)[\s\S]*?\}/);
    expect(projectDepsMatch).not.toBeNull();
    // google-services classpath should only appear once
    const count = (updatedRoot.match(/com\.google\.gms:google-services/g) || []).length;
    expect(count).toBe(1);
  });

  // Fix #5/#8: Backup before overwrite
  it('creates a .bak backup file before overwriting existing google-services.json', () => {
    const androidAppDir = path.join(tempDir, 'android', 'app');
    fs.mkdirSync(androidAppDir, { recursive: true });
    fs.writeFileSync(path.join(androidAppDir, 'build.gradle'), 'apply plugin: "com.android.application"\n');

    const existingContent = JSON.stringify({ project_info: { project_id: 'old-project' } });
    const targetPath = path.join(androidAppDir, 'google-services.json');
    fs.writeFileSync(targetPath, existingContent);

    const newContent = JSON.stringify({ project_info: { project_id: 'new-project' } });
    configureAndroid(tempDir, newContent, false, 'com.test.app');

    // The new file should be written
    expect(fs.readFileSync(targetPath, 'utf-8')).toContain('new-project');
    // The backup should exist with the old content
    const backupPath = targetPath + '.bak';
    expect(fs.existsSync(backupPath)).toBe(true);
    expect(fs.readFileSync(backupPath, 'utf-8')).toContain('old-project');
  });

  it('rejects invalid JSON in google-services.json content', () => {
    const androidAppDir = path.join(tempDir, 'android', 'app');
    fs.mkdirSync(androidAppDir, { recursive: true });

    const res = configureAndroid(tempDir, 'NOT JSON AT ALL', false, 'com.test.app');
    expect(res.googleServicesJsonPlaced).toBe(false);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.warnings[0]).toContain('valid JSON');
  });

  it('configures iOS GoogleService-Info.plist in target folder', () => {
    const iosAppDir = path.join(tempDir, 'ios', 'MyApp');
    fs.mkdirSync(iosAppDir, { recursive: true });

    const mockPlist = '<?xml version="1.0" encoding="UTF-8"?>\n<plist><dict></dict></plist>';
    const res = configureIos(tempDir, mockPlist, false, 'com.test.app');

    expect(res.googleServiceInfoPlistPlaced).toBe(true);
    expect(fs.existsSync(path.join(iosAppDir, 'GoogleService-Info.plist'))).toBe(true);
  });

  it('rejects invalid plist content for iOS configuration', () => {
    const iosAppDir = path.join(tempDir, 'ios', 'MyApp');
    fs.mkdirSync(iosAppDir, { recursive: true });

    const res = configureIos(tempDir, 'NOT A PLIST', false, 'com.test.app');
    expect(res.googleServiceInfoPlistPlaced).toBe(false);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('parses Web SDK config from Firebase CLI JSON output', () => {
    // Simulate what Firebase CLI --json actually returns
    const cliJsonOutput = JSON.stringify({
      status: 'success',
      result: {
        sdkConfig: {
          apiKey: 'AIzaSyDummyKey123',
          authDomain: 'my-app.firebaseapp.com',
          projectId: 'my-app',
          storageBucket: 'my-app.appspot.com',
          messagingSenderId: '123456789',
          appId: '1:123456789:web:abcdef',
        },
      },
    });
    const parsed = parseWebSdkConfig(cliJsonOutput);
    expect(parsed).not.toBeNull();
    expect(parsed?.apiKey).toBe('AIzaSyDummyKey123');
    expect(parsed?.projectId).toBe('my-app');
  });

  it('parses Web SDK config from JS const firebaseConfig = {...} format', () => {
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
      const content = fs.readFileSync(res.filePath, 'utf-8');
      expect(content).toContain("import { initializeApp, getApps, getApp } from 'firebase/app';");
      expect(content).toContain('AIzaSyDummyKey123');
    }
  });

  it('warns when overwriting an existing firebaseConfig file', () => {
    const configPath = path.join(tempDir, 'firebaseConfig.ts');
    fs.writeFileSync(configPath, '// old config');
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

    const config = {
      apiKey: 'new-key',
      authDomain: 'proj.firebaseapp.com',
      projectId: 'proj',
      storageBucket: 'proj.appspot.com',
      messagingSenderId: '123',
      appId: '1:123:web:abc',
    };

    const res = configureWeb(tempDir, config);
    expect(res.created).toBe(true);
    expect(res.warnings.some(w => w.includes('Overwriting'))).toBe(true);
  });
});
