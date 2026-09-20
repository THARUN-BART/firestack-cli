import path from 'node:path';
import { fileExists } from '../utils/fs';
import { detectPackageManager } from './package-manager';
import { detectPlatforms } from './platforms';
import { detectDependencies } from './dependencies';
import type { ProjectInfo } from '../types';

export function detectProject(projectDir: string = process.cwd()): ProjectInfo {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const appJsonPath = path.join(projectDir, 'app.json');
  const hasAppJson = fileExists(appJsonPath);
  const hasAppConfig = fileExists(path.join(projectDir, 'app.config.js')) || fileExists(path.join(projectDir, 'app.config.ts'));

  const dependencies = detectDependencies(projectDir);
  const platforms = detectPlatforms(projectDir);
  const packageManager = detectPackageManager(projectDir);

  const isExpo = Boolean(dependencies.hasExpo || hasAppJson || hasAppConfig);
  const isBareReactNative = Boolean(dependencies.hasReactNative && !isExpo);

  return {
    rootPath: projectDir,
    isExpo,
    isBareReactNative,
    packageManager,
    hasAndroid: platforms.hasAndroid,
    hasIos: platforms.hasIos,
    androidPackageName: platforms.androidPackageName,
    iosBundleId: platforms.iosBundleId,
    appJsonPath: hasAppJson ? appJsonPath : undefined,
    packageJsonPath,
    installedDependencies: dependencies.installed,
    hasGoogleServicesJson: platforms.hasGoogleServicesJson,
    hasGoogleServiceInfoPlist: platforms.hasGoogleServiceInfoPlist,
    hasFirebaseWebConfig: platforms.hasFirebaseWebConfig,
  };
}
