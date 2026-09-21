import fs from 'node:fs';
import path from 'node:path';
import { fileExists, isDirectory, readTextFile, writeTextFile, backupIfExists } from '../utils/fs';
import { updateExpoConfig } from '../expo/plugins';


export interface IosConfigResult {
  googleServiceInfoPlistPlaced: boolean;
  expoConfigUpdated: boolean;
  targetPaths: string[];
  warnings: string[];
}


export function configureIos(
  projectDir: string,
  plistContent: string,
  isExpo: boolean,
  bundleId?: string
): IosConfigResult {
  const warnings: string[] = [];
  const targetPaths: string[] = [];
  let googleServiceInfoPlistPlaced = false;

  // Validate content looks like a plist
  if (!plistContent.trim().startsWith('<?xml') && !plistContent.trim().startsWith('<plist')) {
    warnings.push('GoogleService-Info.plist content does not appear to be a valid plist');
    return { googleServiceInfoPlistPlaced: false, expoConfigUpdated: false, targetPaths, warnings };
  }

  const iosDir = path.join(projectDir, 'ios');
  // Fix #6: use isDirectory for directory check
  if (isDirectory(iosDir)) {
    try {
      const items = fs.readdirSync(iosDir);
      for (const item of items) {
        const full = path.join(iosDir, item);
        // Find main target directory: exclude xcodeproj/xcworkspace/Pods directories
        if (
          fs.statSync(full).isDirectory() &&
          !item.endsWith('.xcodeproj') &&
          !item.endsWith('.xcworkspace') &&
          item !== 'Pods' &&
          !item.startsWith('.')
        ) {
          const targetPath = path.join(full, 'GoogleService-Info.plist');
          // Fix #5: backup before overwriting
          const backed = backupIfExists(targetPath);
          if (backed) warnings.push(`Existing plist backed up to ${path.basename(backed)} in ${item}/`);
          if (writeTextFile(targetPath, plistContent)) {
            targetPaths.push(targetPath);
            googleServiceInfoPlistPlaced = true;
          }
        }
      }
    } catch {
      warnings.push('Failed to inspect ios directory for GoogleService-Info.plist placement');
    }
  }

  let expoConfigUpdated = false;
  if (isExpo) {
    const rootPath = path.join(projectDir, 'GoogleService-Info.plist');
    // Fix #5: backup before overwriting
    const backed = backupIfExists(rootPath);
    if (backed) warnings.push(`Existing root GoogleService-Info.plist backed up to ${path.basename(backed)}`);
    if (writeTextFile(rootPath, plistContent)) {
      targetPaths.push(rootPath);
      googleServiceInfoPlistPlaced = true;
    }

    const res = updateExpoConfig(projectDir, {
      bundleIdentifier: bundleId,
      configureIosServicesFile: true,
      addFirebasePlugin: true,
    });
    expoConfigUpdated = res.updated;
    if (res.error) {
      warnings.push(res.error);
    }
  }

  return {
    googleServiceInfoPlistPlaced,
    expoConfigUpdated,
    targetPaths,
    warnings,
  };
}
