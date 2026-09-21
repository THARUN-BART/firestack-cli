import path from 'node:path';
import { runFirebaseCommand } from './cli';
import { runCommandSync } from '../utils/exec';
import { readTextFile } from '../utils/fs';
import type { FirebaseApp } from '../types';

export function listFirebaseApps(
  projectId: string,
  platform?: 'ANDROID' | 'IOS' | 'WEB'
): { success: boolean; apps: FirebaseApp[]; error?: string } {
  const args = ['apps:list', '--project', projectId, '--json'];
  if (platform) {
    args.splice(1, 0, platform.toLowerCase());
  }

  const res = runFirebaseCommand<{ status: string; result: any[] }>(args);

  if (!res.success) {
    return {
      success: false,
      apps: [],
      error: res.error || `Failed to list apps for project "${projectId}"`,
    };
  }

  const list = res.data?.result || [];
  const apps: FirebaseApp[] = list.map((item: any) => ({
    appId: item.appId,
    displayName: item.displayName || item.appId,
    platform: (item.platform || '').toUpperCase() as 'ANDROID' | 'IOS' | 'WEB',
    packageName: item.packageName,
    bundleId: item.bundleId,
    namespace: item.namespace,
  }));

  return {
    success: true,
    apps,
  };
}

/**
 * Fix #9: Derive a readable display name from the package name
 * instead of using the reverse-domain notation directly.
 * e.g. "com.example.myapp" → "myapp"
 */
function deriveDisplayName(projectDir: string, packageOrBundle: string): string {
  // Take the last segment of the reverse-domain as a readable label
  const parts = packageOrBundle.split('.');
  const lastPart = parts[parts.length - 1];
  return lastPart && lastPart.length > 0 ? lastPart : packageOrBundle;
}

export function createAndroidApp(
  projectId: string,
  packageName: string,
  displayName: string
): { success: boolean; app?: FirebaseApp; error?: string } {
  const args = [
    'apps:create',
    'ANDROID',
    displayName,
    '--package-name',
    packageName,
    '--project',
    projectId,
    '--json',
  ];

  const res = runFirebaseCommand<{ status: string; result: any }>(args);

  if (!res.success) {
    return {
      success: false,
      error: res.error || `Failed to create Android app with package "${packageName}"`,
    };
  }

  const result = res.data?.result;
  const app: FirebaseApp = {
    appId: result?.appId || '',
    displayName,
    platform: 'ANDROID',
    packageName,
  };

  return {
    success: true,
    app,
  };
}

export function createIosApp(
  projectId: string,
  bundleId: string,
  displayName: string
): { success: boolean; app?: FirebaseApp; error?: string } {
  const args = [
    'apps:create',
    'IOS',
    displayName,
    '--bundle-id',
    bundleId,
    '--project',
    projectId,
    '--json',
  ];

  const res = runFirebaseCommand<{ status: string; result: any }>(args);

  if (!res.success) {
    return {
      success: false,
      error: res.error || `Failed to create iOS app with bundle ID "${bundleId}"`,
    };
  }

  const result = res.data?.result;
  const app: FirebaseApp = {
    appId: result?.appId || '',
    displayName,
    platform: 'IOS',
    bundleId,
  };

  return {
    success: true,
    app,
  };
}

export function createWebApp(
  projectId: string,
  displayName: string
): { success: boolean; app?: FirebaseApp; error?: string } {
  const args = [
    'apps:create',
    'WEB',
    displayName,
    '--project',
    projectId,
    '--json',
  ];

  const res = runFirebaseCommand<{ status: string; result: any }>(args);

  if (!res.success) {
    return {
      success: false,
      error: res.error || `Failed to create Web app "${displayName}"`,
    };
  }

  const result = res.data?.result;
  const app: FirebaseApp = {
    appId: result?.appId || '',
    displayName,
    platform: 'WEB',
  };

  return {
    success: true,
    app,
  };
}

export function downloadSdkConfig(
  platform: 'ANDROID' | 'IOS' | 'WEB',
  appId: string,
  projectId: string,
  outputPath?: string
): { success: boolean; content?: string; error?: string } {
  const args = ['apps:sdkconfig', platform.toLowerCase(), appId, '--project', projectId, '--json'];
  if (outputPath) {
    // Security fix: validate outputPath stays within current working directory
    // to prevent path traversal via the -o argument
    if (path.isAbsolute(outputPath)) {
      return { success: false, error: 'outputPath must be a relative path' };
    }
    const resolved = path.resolve(process.cwd(), outputPath);
    const cwd = path.resolve(process.cwd());
    if (!resolved.startsWith(cwd + path.sep) && resolved !== cwd) {
      return { success: false, error: 'outputPath escapes working directory' };
    }
    args.push('-o', outputPath);
  }


  const res = runCommandSync('firebase', args);

  if (res.exitCode !== 0) {
    return {
      success: false,
      error: res.stderr || res.stdout || `Failed to retrieve SDK config for ${platform} app ${appId}`,
    };
  }

  if (outputPath) {
    const content = readTextFile(outputPath);
    return {
      success: true,
      content: content || undefined,
    };
  }

  return {
    success: true,
    content: res.stdout,
  };
}
