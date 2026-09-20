import fs from 'node:fs';
import path from 'node:path';
import { fileExists, writeTextFile } from '../utils/fs';
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

  const iosDir = path.join(projectDir, 'ios');
  if (fileExists(iosDir)) {
    try {
      const items = fs.readdirSync(iosDir);
      for (const item of items) {
        const full = path.join(iosDir, item);
        // Find main target directory: directory with same name as xcodeproj without .xcodeproj
        if (fs.statSync(full).isDirectory() && !item.endsWith('.xcodeproj') && !item.endsWith('.xcworkspace') && item !== 'Pods') {
          const targetPath = path.join(full, 'GoogleService-Info.plist');
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
