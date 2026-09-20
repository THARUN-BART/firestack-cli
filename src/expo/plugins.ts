import path from 'node:path';
import { readJsonFile, writeJsonFile } from '../utils/fs';

export interface ExpoConfigOptions {
  packageName?: string;
  bundleIdentifier?: string;
  configureAndroidServicesFile?: boolean;
  configureIosServicesFile?: boolean;
  addFirebasePlugin?: boolean;
}

export function updateExpoConfig(
  projectDir: string,
  options: ExpoConfigOptions
): { updated: boolean; error?: string } {
  const appJsonPath = path.join(projectDir, 'app.json');
  const appJson = readJsonFile(appJsonPath);

  if (!appJson) {
    return { updated: false, error: 'app.json not found or could not be parsed' };
  }

  const expo = appJson.expo || (appJson.expo = {});

  if (options.packageName) {
    expo.android = expo.android || {};
    expo.android.package = options.packageName;
  }

  if (options.bundleIdentifier) {
    expo.ios = expo.ios || {};
    expo.ios.bundleIdentifier = options.bundleIdentifier;
  }

  if (options.configureAndroidServicesFile) {
    expo.android = expo.android || {};
    expo.android.googleServicesFile = './google-services.json';
  }

  if (options.configureIosServicesFile) {
    expo.ios = expo.ios || {};
    expo.ios.googleServicesFile = './GoogleService-Info.plist';
  }

  if (options.addFirebasePlugin) {
    expo.plugins = expo.plugins || [];
    const pluginName = '@react-native-firebase/app';
    const hasPlugin = expo.plugins.some((p: any) => {
      if (typeof p === 'string') return p === pluginName;
      if (Array.isArray(p)) return p[0] === pluginName;
      return false;
    });

    if (!hasPlugin) {
      expo.plugins.push(pluginName);
    }
  }

  const success = writeJsonFile(appJsonPath, appJson);
  return { updated: success };
}
