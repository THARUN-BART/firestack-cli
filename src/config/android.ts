import path from 'node:path';
import { fileExists, isDirectory, readTextFile, writeTextFile } from '../utils/fs';
import { updateExpoConfig } from '../expo/plugins';

export interface AndroidConfigResult {
  googleServicesJsonPlaced: boolean;
  gradleModified: boolean;
  expoConfigUpdated: boolean;
  warnings: string[];
}

/**
 * Fix #5/#8: Backup an existing file before overwriting it.
 * Returns the backup path if a backup was created, or null if no existing file.
 */
function backupIfExists(filePath: string): string | null {
  if (!fileExists(filePath)) return null;
  const backupPath = filePath + '.bak';
  try {
    const content = readTextFile(filePath);
    if (content) {
      writeTextFile(backupPath, content);
      return backupPath;
    }
  } catch {
    // Non-fatal: proceed without backup
  }
  return null;
}

/**
 * Fix #4: Insert Google Services classpath ONLY inside the buildscript { ... }
 * dependencies block, not the top-level project dependencies block.
 * Also fix #6: use isDirectory() instead of fileExists() for directory checks.
 */
export function configureAndroidGradle(projectDir: string): { modified: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let modified = false;

  // Fix #6: use isDirectory for directory checks
  if (!isDirectory(path.join(projectDir, 'android'))) {
    return { modified, warnings };
  }

  const rootGradlePath = path.join(projectDir, 'android', 'build.gradle');
  if (fileExists(rootGradlePath)) {
    let content = readTextFile(rootGradlePath) || '';
    if (!content.includes('com.google.gms:google-services') && !content.includes('com.google.gms.google-services')) {
      // Fix #4: Scope insert to inside the buildscript { ... } block only
      const buildscriptMatch = content.match(/(buildscript\s*\{[\s\S]*?dependencies\s*\{)/);
      if (buildscriptMatch) {
        content = content.replace(
          buildscriptMatch[1],
          buildscriptMatch[1] + "\n        classpath('com.google.gms:google-services:4.4.2')"
        );
        writeTextFile(rootGradlePath, content);
        modified = true;
      } else if (content.includes('dependencies {')) {
        // Fallback for non-standard Gradle structures
        warnings.push(
          'android/build.gradle may not follow standard structure. ' +
          'Please manually add: classpath("com.google.gms:google-services:4.4.2") inside buildscript > dependencies.'
        );
      } else {
        warnings.push(
          'Could not automatically add com.google.gms:google-services classpath to android/build.gradle. Please add it manually.'
        );
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

  // Validate the content looks like JSON (basic sanity check)
  if (!googleServicesJsonContent.trim().startsWith('{')) {
    return {
      googleServicesJsonPlaced: false,
      gradleModified: false,
      expoConfigUpdated: false,
      warnings: ['google-services.json content does not appear to be valid JSON'],
    };
  }

  let googleServicesJsonPlaced = false;

  // Fix #6: use isDirectory for directory checks
  if (isDirectory(path.join(projectDir, 'android'))) {
    const androidAppDir = path.join(projectDir, 'android', 'app');
    const targetAndroidAppJson = path.join(androidAppDir, 'google-services.json');
    // Fix #5: backup before overwriting
    const backed = backupIfExists(targetAndroidAppJson);
    if (backed) warnings.push(`Existing google-services.json backed up to ${path.basename(backed)}`);
    googleServicesJsonPlaced = writeTextFile(targetAndroidAppJson, googleServicesJsonContent);
  }

  // For Expo, also write to the root where app.json points
  let expoConfigUpdated = false;
  if (isExpo) {
    const rootTarget = path.join(projectDir, 'google-services.json');
    // Fix #5: backup before overwriting
    const backed = backupIfExists(rootTarget);
    if (backed) warnings.push(`Existing root google-services.json backed up to ${path.basename(backed)}`);
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

  const gradleRes = configureAndroidGradle(projectDir);
  const gradleModified = gradleRes.modified;
  warnings.push(...gradleRes.warnings);

  return {
    googleServicesJsonPlaced,
    gradleModified,
    expoConfigUpdated,
    warnings,
  };
}
