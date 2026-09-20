import path from 'node:path';
import { fileExists, isDirectory, writeTextFile } from '../utils/fs';
import type { FirebaseWebConfig } from '../types';

export interface WebConfigResult {
  filePath: string;
  created: boolean;
  warnings: string[];
}

/**
 * Fix #7: Parse Web SDK config more robustly.
 * Firebase CLI --json mode returns an object with a `sdkConfig` key.
 * We try structured parsing first, then fall back to pattern matching.
 */
export function parseWebSdkConfig(rawOutput: string): FirebaseWebConfig | null {
  try {
    // Strip ANSI escape codes
    const cleaned = rawOutput.replace(/\x1B\[[0-9;]*m/g, '');

    // Strategy 1: Firebase CLI --json output wraps config in { result: { sdkConfig: {...} } }
    const lines = cleaned.split('\n');
    let jsonStart = -1;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        jsonStart = i;
        break;
      }
    }
    if (jsonStart !== -1) {
      for (let end = lines.length; end >= jsonStart + 1; end--) {
        try {
          const candidate = lines.slice(jsonStart, end).join('\n');
          const parsed = JSON.parse(candidate);
          // Firebase CLI returns { status, result: { sdkConfig: {...} } }
          const sdkConfig = parsed?.result?.sdkConfig || parsed?.sdkConfig || parsed;
          if (sdkConfig?.apiKey && sdkConfig?.projectId && sdkConfig?.appId) {
            return {
              apiKey: String(sdkConfig.apiKey),
              authDomain: String(sdkConfig.authDomain || `${sdkConfig.projectId}.firebaseapp.com`),
              projectId: String(sdkConfig.projectId),
              storageBucket: String(sdkConfig.storageBucket || `${sdkConfig.projectId}.appspot.com`),
              messagingSenderId: String(sdkConfig.messagingSenderId || ''),
              appId: String(sdkConfig.appId),
              measurementId: sdkConfig.measurementId ? String(sdkConfig.measurementId) : undefined,
            };
          }
        } catch {
          // try shorter slice
        }
      }
    }

    // Strategy 2: Match the JS `const firebaseConfig = { ... }` pattern
    // Find the specific block rather than greedy [\s\S]*
    const configBlockMatch = cleaned.match(/(?:const\s+firebaseConfig\s*=\s*|firebaseConfig\s*=\s*)(\{[^}]+\})/s);
    if (configBlockMatch) {
      // Replace JS-style property names into valid JSON
      const jsObj = configBlockMatch[1]
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"');
      try {
        const parsed = JSON.parse(jsObj);
        if (parsed.apiKey && parsed.projectId && parsed.appId) {
          return {
            apiKey: String(parsed.apiKey),
            authDomain: String(parsed.authDomain || `${parsed.projectId}.firebaseapp.com`),
            projectId: String(parsed.projectId),
            storageBucket: String(parsed.storageBucket || `${parsed.projectId}.appspot.com`),
            messagingSenderId: String(parsed.messagingSenderId || ''),
            appId: String(parsed.appId),
            measurementId: parsed.measurementId ? String(parsed.measurementId) : undefined,
          };
        }
      } catch {
        // fall through
      }
    }

    // Strategy 3: Individual key-value extraction as last resort
    const apiKey = cleaned.match(/apiKey:\s*['"]([^'"]+)['"]/)?.[1];
    const authDomain = cleaned.match(/authDomain:\s*['"]([^'"]+)['"]/)?.[1];
    const projectId = cleaned.match(/projectId:\s*['"]([^'"]+)['"]/)?.[1];
    const storageBucket = cleaned.match(/storageBucket:\s*['"]([^'"]+)['"]/)?.[1];
    const messagingSenderId = cleaned.match(/messagingSenderId:\s*['"]([^'"]+)['"]/)?.[1];
    const appId = cleaned.match(/appId:\s*['"]([^'"]+)['"]/)?.[1];
    const measurementId = cleaned.match(/measurementId:\s*['"]([^'"]+)['"]/)?.[1];

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

  // Warn if overwriting an existing file
  if (fileExists(filePath)) {
    warnings.push(`Overwriting existing ${path.basename(filePath)}`);
  }

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
