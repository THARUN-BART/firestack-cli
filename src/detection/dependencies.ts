import path from 'node:path';
import { readJsonFile } from '../utils/fs';

export interface DependencyStatus {
  installed: Record<string, string>;
  hasReactNativeFirebaseApp: boolean;
  hasFirebaseJsSdk: boolean;
  hasExpo: boolean;
  hasReactNative: boolean;
  installedRnfModules: string[];
}

export function detectDependencies(projectDir: string = process.cwd()): DependencyStatus {
  const packageJsonPath = path.join(projectDir, 'package.json');
  const packageJson = readJsonFile(packageJsonPath) || {};

  const dependencies: Record<string, string> = {
    ...(packageJson.dependencies || {}),
    ...(packageJson.devDependencies || {}),
  };

  const installedRnfModules: string[] = [];
  let hasReactNativeFirebaseApp = false;
  let hasFirebaseJsSdk = false;
  let hasExpo = false;
  let hasReactNative = false;

  for (const [pkg] of Object.entries(dependencies)) {
    if (pkg === '@react-native-firebase/app') {
      hasReactNativeFirebaseApp = true;
      installedRnfModules.push(pkg);
    } else if (pkg.startsWith('@react-native-firebase/')) {
      installedRnfModules.push(pkg);
    } else if (pkg === 'firebase') {
      hasFirebaseJsSdk = true;
    } else if (pkg === 'expo') {
      hasExpo = true;
    } else if (pkg === 'react-native') {
      hasReactNative = true;
    }
  }

  return {
    installed: dependencies,
    hasReactNativeFirebaseApp,
    hasFirebaseJsSdk,
    hasExpo,
    hasReactNative,
    installedRnfModules,
  };
}
