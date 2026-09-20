import path from 'node:path';
import { fileExists, isDirectory, writeTextFile } from '../utils/fs';
import type { FirebaseWebConfig } from '../types';

export interface WebConfigResult {
  filePath: string;
  created: boolean;
  warnings: string[];
}

export function parseWebSdkConfig(rawOutput: string): FirebaseWebConfig | null {
  try {
    // Check if raw output contains firebaseConfig object
    // Often formatted like:
    // const firebaseConfig = { ... };
    // or direct JSON
    const jsonMatch = rawOutput.match(/\{[\s\S]*"apiKey"[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Match JS object syntax: apiKey: "...", authDomain: "..."
    const apiKey = rawOutput.match(/apiKey:\s*['"]([^'"]+)['"]/)?.[1];
    const authDomain = rawOutput.match(/authDomain:\s*['"]([^'"]+)['"]/)?.[1];
    const projectId = rawOutput.match(/projectId:\s*['"]([^'"]+)['"]/)?.[1];
    const storageBucket = rawOutput.match(/storageBucket:\s*['"]([^'"]+)['"]/)?.[1];
    const messagingSenderId = rawOutput.match(/messagingSenderId:\s*['"]([^'"]+)['"]/)?.[1];
    const appId = rawOutput.match(/appId:\s*['"]([^'"]+)['"]/)?.[1];
    const measurementId = rawOutput.match(/measurementId:\s*['"]([^'"]+)['"]/)?.[1];

    if (apiKey && projectId && appId) {
      return {
        apiKey,
        authDomain: authDomain || `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: storageBucket || `${projectId}.appspot.com`,
        messagingSenderId: messagingSenderId || '',
        appId,
        measurementId,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

export function generateWebConfigFileContent(config: FirebaseWebConfig, isTypeScript = true): string {
  const code = `// Firebase Web Configuration (Firebase JS SDK)
// Note: This configuration is specifically used for Web platform builds.
// For native Android & iOS, React Native Firebase utilizes native configuration files:
// - Android: google-services.json
// - iOS: GoogleService-Info.plist

import { initializeApp, getApps, getApp } from 'firebase/app';

export const firebaseConfig = {
  apiKey: ${JSON.stringify(config.apiKey)},
  authDomain: ${JSON.stringify(config.authDomain)},
  projectId: ${JSON.stringify(config.projectId)},
  storageBucket: ${JSON.stringify(config.storageBucket)},
  messagingSenderId: ${JSON.stringify(config.messagingSenderId)},
  appId: ${JSON.stringify(config.appId)}${
    config.measurementId ? `,\n  measurementId: ${JSON.stringify(config.measurementId)}` : ''
  }
};

// Initialize Firebase for Web only if not already initialized
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
`;
  return code;
}

export function configureWeb(
  projectDir: string,
  config: FirebaseWebConfig
): WebConfigResult {
  const warnings: string[] = [];
  const srcDir = path.join(projectDir, 'src');
  const isTs = fileExists(path.join(projectDir, 'tsconfig.json'));
  const ext = isTs ? 'ts' : 'js';

  const targetDir = isDirectory(srcDir) ? srcDir : projectDir;
  const filePath = path.join(targetDir, `firebaseConfig.${ext}`);

  const content = generateWebConfigFileContent(config, isTs);
  const created = writeTextFile(filePath, content);

  if (!created) {
    warnings.push(`Failed to write web configuration file to ${filePath}`);
  }

  return {
    filePath,
    created,
    warnings,
  };
}
