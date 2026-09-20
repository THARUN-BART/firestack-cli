import path from 'node:path';
import { fileExists, readTextFile, writeTextFile } from '../utils/fs';
import { updateExpoConfig } from '../expo/plugins';

export interface AndroidConfigResult {
  googleServicesJsonPlaced: boolean;
  gradleModified: boolean;
  expoConfigUpdated: boolean;
  warnings: string[];
}

export function configureAndroidGradle(projectDir: string): { modified: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let modified = false;

  const rootGradlePath = path.join(projectDir, 'android', 'build.gradle');
  if (fileExists(rootGradlePath)) {
    let content = readTextFile(rootGradlePath) || '';
    if (!content.includes('com.google.gms:google-services') && !content.includes('com.google.gms.google-services')) {
      // Find dependencies { ... } inside buildscript { ... }
      if (content.includes('dependencies {')) {
        content = content.replace(
          /dependencies\s*\{/,
          `dependencies {\n        classpath('com.google.gms:google-services:4.4.2')`
        );
        writeTextFile(rootGradlePath, content);
        modified = true;
      } else {
        warnings.push('Could not automatically add com.google.gms:google-services classpath to android/build.gradle');
      }
    }
  }

  const appGradlePath = path.join(projectDir, 'android', 'app', 'build.gradle');
  if (fileExists(appGradlePath)) {
    let content = readTextFile(appGradlePath) || '';
    const hasPlugin =
      content.includes("apply plugin: 'com.google.gms.google-services'") ||
      content.includes('apply plugin: "com.google.gms.google-services"') ||
      content.includes('id("com.google.gms.google-services")') ||
      content.includes("id 'com.google.gms.google-services'");

    if (!hasPlugin) {
      // Append at bottom of app/build.gradle
      content = content.trimEnd() + "\n\napply plugin: 'com.google.gms.google-services'\n";
      writeTextFile(appGradlePath, content);
      modified = true;
    }
  }

  return { modified, warnings };
}

export function configureAndroid(
  projectDir: string,
  googleServicesJsonContent: string,
  isExpo: boolean,
  packageName?: string
): AndroidConfigResult {
  const warnings: string[] = [];

  // Write to android/app/google-services.json if android directory exists
  let googleServicesJsonPlaced = false;
  const androidAppDir = path.join(projectDir, 'android', 'app');
  const targetAndroidAppJson = path.join(androidAppDir, 'google-services.json');

  if (fileExists(path.join(projectDir, 'android'))) {
    googleServicesJsonPlaced = writeTextFile(targetAndroidAppJson, googleServicesJsonContent);
  }

  // If Expo or if root placement is preferred
  let expoConfigUpdated = false;
  if (isExpo) {
    const rootTarget = path.join(projectDir, 'google-services.json');
    const rootPlaced = writeTextFile(rootTarget, googleServicesJsonContent);
    if (rootPlaced) {
      googleServicesJsonPlaced = true;
    }

    const res = updateExpoConfig(projectDir, {
      packageName,
      configureAndroidServicesFile: true,
      addFirebasePlugin: true,
    });
    expoConfigUpdated = res.updated;
    if (res.error) {
      warnings.push(res.error);
    }
  }

  let gradleModified = false;
  if (fileExists(path.join(projectDir, 'android'))) {
    const gradleRes = configureAndroidGradle(projectDir);
    gradleModified = gradleRes.modified;
    warnings.push(...gradleRes.warnings);
  }

  return {
    googleServicesJsonPlaced,
    gradleModified,
    expoConfigUpdated,
    warnings,
  };
}
