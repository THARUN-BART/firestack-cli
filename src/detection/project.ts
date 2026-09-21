import path from 'node:path';
import { fileExists } from '../utils/fs';
import { detectPackageManager } from './package-manager';
import { detectPlatforms } from './platforms';
import { detectDependencies } from './dependencies';
import { detectFramework } from './framework';
import type { ProjectInfo } from '../types';

export function detectProject(projectDir: string = process.cwd()): ProjectInfo {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const appJsonPath = path.join(projectDir, 'app.json');
  const hasAppJson = fileExists(appJsonPath);

  const dependencies = detectDependencies(projectDir);
  const platforms = detectPlatforms(projectDir);
  const packageManager = detectPackageManager(projectDir);
  const frameworkInfo = detectFramework(projectDir, dependencies.installed);

  // Check for environment files
  const envCandidates = [
    frameworkInfo.envFileName,
    '.env.local',
    '.env',
    '.env.development',
    '.env.production',
  ];
  let envFilePath: string | undefined;
  for (const candidate of envCandidates) {
    const full = path.join(projectDir, candidate);
    if (fileExists(full)) {
      envFilePath = full;
      break;
    }
  }

  return {
    rootPath: projectDir,
    framework: frameworkInfo.framework,
    frameworkDisplayName: frameworkInfo.frameworkDisplayName,
    isExpo: frameworkInfo.isExpo,
    isBareReactNative: frameworkInfo.isBareReactNative,
    isWebFramework: frameworkInfo.isWebFramework,
    isTypeScript: frameworkInfo.isTypeScript,
    sourceDir: frameworkInfo.sourceDir,
    routerType: frameworkInfo.routerType,
    envPrefix: frameworkInfo.envPrefix,
    envFileName: frameworkInfo.envFileName,
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
    firebaseWebConfigPath: platforms.firebaseWebConfigPath,
    hasEnvFile: !!envFilePath,
    envFilePath,
  };
}
