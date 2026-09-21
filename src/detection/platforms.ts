import fs from 'node:fs';
import path from 'node:path';
import { fileExists, isDirectory, readJsonFile, readTextFile } from '../utils/fs';

export interface PlatformDetectionResult {
  hasAndroid: boolean;
  hasIos: boolean;
  androidPackageName?: string;
  iosBundleId?: string;
  hasGoogleServicesJson: boolean;
  googleServicesJsonPath?: string;
  hasGoogleServiceInfoPlist: boolean;
  googleServiceInfoPlistPath?: string;
  hasFirebaseWebConfig: boolean;
  firebaseWebConfigPath?: string;
}

function safeResolvePath(projectDir: string, relativePath: unknown): string | null {
  if (typeof relativePath !== 'string' || !relativePath.trim()) {
    return null;
  }
  // Prevent absolute paths or paths with null bytes
  if (path.isAbsolute(relativePath) || relativePath.includes('\0')) {
    return null;
  }
  const resolved = path.resolve(projectDir, relativePath);
  const projectRoot = path.resolve(projectDir);
  // Ensure the resolved path is inside the project directory
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    return null;
  }
  return resolved;
}

export function detectPlatforms(projectDir: string = process.cwd()): PlatformDetectionResult {
  const androidDir = path.join(projectDir, 'android');
  const iosDir = path.join(projectDir, 'ios');
  const hasAndroid = isDirectory(androidDir);
  const hasIos = isDirectory(iosDir);

  // Check app.json (Expo)
  const appJsonPath = path.join(projectDir, 'app.json');
  const appJson = readJsonFile(appJsonPath);
  const expoConfig = appJson?.expo || appJson;

  let androidPackageName: string | undefined = expoConfig?.android?.package;
  let iosBundleId: string | undefined = expoConfig?.ios?.bundleIdentifier;

  // Validate that package/bundle IDs look like reverse-domain names to avoid injection
  if (androidPackageName && !/^[a-zA-Z][a-zA-Z0-9._]*$/.test(androidPackageName)) {
    androidPackageName = undefined;
  }
  if (iosBundleId && !/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(iosBundleId)) {
    iosBundleId = undefined;
  }

  // If not found in app.json and android folder exists, inspect android project
  if (!androidPackageName && hasAndroid) {
    const buildGradlePath = path.join(androidDir, 'app', 'build.gradle');
    const buildGradle = readTextFile(buildGradlePath);
    if (buildGradle) {
      const namespaceMatch = buildGradle.match(/namespace\s+['"]([a-zA-Z0-9._]+)['"]/);
      const appIdMatch = buildGradle.match(/applicationId\s+['"]([a-zA-Z0-9._]+)['"]/);
      androidPackageName = namespaceMatch?.[1] || appIdMatch?.[1];
    }

    if (!androidPackageName) {
      const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
      const manifest = readTextFile(manifestPath);
      if (manifest) {
        const pkgMatch = manifest.match(/package=['"]([a-zA-Z0-9._]+)['"]/);
        androidPackageName = pkgMatch?.[1];
      }
    }
  }

  // If not found in app.json and ios folder exists, inspect ios project
  if (!iosBundleId && hasIos) {
    try {
      const files = fs.readdirSync(iosDir);
      for (const file of files) {
        if (file.endsWith('.xcodeproj')) {
          const pbxPath = path.join(iosDir, file, 'project.pbxproj');
          const pbx = readTextFile(pbxPath);
          if (pbx) {
            const bundleMatch = pbx.match(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/);
            if (bundleMatch && bundleMatch[1]) {
              const id = bundleMatch[1].trim();
              // Reject variable interpolations and validate format
              if (!id.includes('$') && /^[a-zA-Z][a-zA-Z0-9._-]*$/.test(id)) {
                iosBundleId = id;
                break;
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Detect google-services.json — use safeResolvePath to prevent path traversal
  const defaultAndroidJson = path.join(projectDir, 'android', 'app', 'google-services.json');
  const rootAndroidJson = path.join(projectDir, 'google-services.json');
  const expoAndroidJsonRaw = expoConfig?.android?.googleServicesFile;
  const expoAndroidJson = safeResolvePath(projectDir, expoAndroidJsonRaw);

  let googleServicesJsonPath: string | undefined;
  if (expoAndroidJson && fileExists(expoAndroidJson)) {
    googleServicesJsonPath = expoAndroidJson;
  } else if (fileExists(defaultAndroidJson)) {
    googleServicesJsonPath = defaultAndroidJson;
  } else if (fileExists(rootAndroidJson)) {
    googleServicesJsonPath = rootAndroidJson;
  }

  // Detect GoogleService-Info.plist — use safeResolvePath
  let googleServiceInfoPlistPath: string | undefined;
  const expoIosPlistRaw = expoConfig?.ios?.googleServicesFile;
  const expoIosPlist = safeResolvePath(projectDir, expoIosPlistRaw);
  const rootIosPlist = path.join(projectDir, 'GoogleService-Info.plist');

  if (expoIosPlist && fileExists(expoIosPlist)) {
    googleServiceInfoPlistPath = expoIosPlist;
  } else if (fileExists(rootIosPlist)) {
    googleServiceInfoPlistPath = rootIosPlist;
  } else if (hasIos) {
    try {
      const items = fs.readdirSync(iosDir);
      for (const item of items) {
        const candidate = path.join(iosDir, item, 'GoogleService-Info.plist');
        if (fileExists(candidate)) {
          googleServiceInfoPlistPath = candidate;
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  // Detect Firebase Web config
  const webCandidates = [
    path.join(projectDir, 'src', 'lib', 'firebase.ts'),
    path.join(projectDir, 'src', 'lib', 'firebase.js'),
    path.join(projectDir, 'lib', 'firebase.ts'),
    path.join(projectDir, 'lib', 'firebase.js'),
    path.join(projectDir, 'src', 'lib', 'firebaseConfig.ts'),
    path.join(projectDir, 'src', 'lib', 'firebaseConfig.js'),
    path.join(projectDir, 'src', 'firebase.ts'),
    path.join(projectDir, 'src', 'firebase.js'),
    path.join(projectDir, 'src', 'firebaseConfig.ts'),
    path.join(projectDir, 'src', 'firebaseConfig.js'),
    path.join(projectDir, 'firebase.ts'),
    path.join(projectDir, 'firebase.js'),
    path.join(projectDir, 'firebaseConfig.ts'),
    path.join(projectDir, 'firebaseConfig.js'),
  ];
  let firebaseWebConfigPath: string | undefined;
  for (const candidate of webCandidates) {
    if (fileExists(candidate)) {
      firebaseWebConfigPath = candidate;
      break;
    }
  }

  return {
    hasAndroid,
    hasIos,
    androidPackageName,
    iosBundleId,
    hasGoogleServicesJson: !!googleServicesJsonPath,
    googleServicesJsonPath,
    hasGoogleServiceInfoPlist: !!googleServiceInfoPlistPath,
    googleServiceInfoPlistPath,
    hasFirebaseWebConfig: !!firebaseWebConfigPath,
    firebaseWebConfigPath,
  };
}
