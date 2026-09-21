import path from 'node:path';
import { fileExists, isDirectory, writeTextFile } from '../utils/fs';
import type { FirebaseWebConfig, FrameworkType, EnvPrefix, FirebaseService } from '../types';

export interface WebConfigResult {
  filePath: string;
  created: boolean;
  warnings: string[];
}

export interface WebConfigOptions {
  framework?: FrameworkType;
  envPrefix?: EnvPrefix;
  useEnvVariables?: boolean;
  services?: FirebaseService[];
  isTypeScript?: boolean;
}

/**
 * Robust Web SDK config parser supporting:
 * 1. Firebase CLI JSON output { result: { sdkConfig: { ... } } }
 * 2. JS config blocks `const firebaseConfig = { ... }`
 * 3. Individual key extraction
 */
export function parseWebSdkConfig(rawOutput: string): FirebaseWebConfig | null {
  try {
    const cleaned = rawOutput.replace(/\x1B\[[0-9;]*m/g, '');

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

    const configBlockMatch = cleaned.match(/(?:const\s+firebaseConfig\s*=\s*|firebaseConfig\s*=\s*)(\{[^}]+\})/s);
    if (configBlockMatch) {
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

/**
 * Generates tailored Firebase JavaScript/TypeScript boilerplate code
 * with singleton client guards and optional service exports (Auth, Firestore, Storage, etc.)
 */
export function generateWebConfigFileContent(
  config: FirebaseWebConfig,
  options: WebConfigOptions = {}
): string {
  const {
    framework = 'generic',
    envPrefix = '',
    useEnvVariables = false,
    services = ['auth', 'firestore', 'storage'],
  } = options;

  const isVite = framework === 'vite';
  const getEnv = (key: string, fallback: string) => {
    if (!useEnvVariables) return JSON.stringify(fallback);
    const envKey = `${envPrefix}${key}`;
    if (isVite) {
      return `import.meta.env.${envKey} || ${JSON.stringify(fallback)}`;
    }
    return `process.env.${envKey} || ${JSON.stringify(fallback)}`;
  };

  const serviceImports: string[] = [];
  const serviceInitializations: string[] = [];
  const serviceExports: string[] = [];

  if (services.includes('auth')) {
    serviceImports.push("import { getAuth } from 'firebase/auth';");
    serviceInitializations.push("export const auth = getAuth(app);");
    serviceExports.push('auth');
  }

  if (services.includes('firestore')) {
    serviceImports.push("import { getFirestore } from 'firebase/firestore';");
    serviceInitializations.push("export const db = getFirestore(app);");
    serviceExports.push('db');
  }

  if (services.includes('storage')) {
    serviceImports.push("import { getStorage } from 'firebase/storage';");
    serviceInitializations.push("export const storage = getStorage(app);");
    serviceExports.push('storage');
  }

  if (services.includes('database')) {
    serviceImports.push("import { getDatabase } from 'firebase/database';");
    serviceInitializations.push("export const database = getDatabase(app);");
    serviceExports.push('database');
  }

  if (services.includes('analytics')) {
    serviceImports.push("import { getAnalytics, isSupported } from 'firebase/analytics';");
    serviceInitializations.push(
      "export const analytics = typeof window !== 'undefined' ? isSupported().then(yes => yes ? getAnalytics(app) : null) : null;"
    );
    serviceExports.push('analytics');
  }

  const code = `// Firebase Client Configuration
// Generated by firestack-cli

import { initializeApp, getApps, getApp } from 'firebase/app';
${serviceImports.join('\n')}

export const firebaseConfig = {
  apiKey: ${getEnv('FIREBASE_API_KEY', config.apiKey)},
  authDomain: ${getEnv('FIREBASE_AUTH_DOMAIN', config.authDomain)},
  projectId: ${getEnv('FIREBASE_PROJECT_ID', config.projectId)},
  storageBucket: ${getEnv('FIREBASE_STORAGE_BUCKET', config.storageBucket)},
  messagingSenderId: ${getEnv('FIREBASE_MESSAGING_SENDER_ID', config.messagingSenderId)},
  appId: ${getEnv('FIREBASE_APP_ID', config.appId)}${
    config.measurementId
      ? `,\n  measurementId: ${getEnv('FIREBASE_MEASUREMENT_ID', config.measurementId)}`
      : ''
  }
};

// Initialize Firebase with singleton pattern
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

${serviceInitializations.join('\n')}
`;

  return code;
}

/**
 * Configure Firebase Web / JS SDK file in the appropriate directory:
 * - Next.js: src/lib/firebase.ts or lib/firebase.ts
 * - Vite / React: src/lib/firebase.ts or src/firebase.ts
 * - Expo / React Native: src/firebaseConfig.ts or firebaseConfig.ts
 */
export function configureWeb(
  projectDir: string,
  config: FirebaseWebConfig,
  options: WebConfigOptions = {}
): WebConfigResult {
  const warnings: string[] = [];
  const isTs =
    options.isTypeScript ??
    fileExists(path.join(projectDir, 'tsconfig.json'));
  const ext = isTs ? 'ts' : 'js';

  let targetDir = projectDir;
  const srcDir = path.join(projectDir, 'src');
  const srcLibDir = path.join(projectDir, 'src', 'lib');
  const libDir = path.join(projectDir, 'lib');
  const appDir = path.join(projectDir, 'app');

  let fileName = `firebaseConfig.${ext}`;

  if (options.framework === 'nextjs' || options.framework === 'remix') {
    fileName = `firebase.${ext}`;
    if (isDirectory(srcLibDir)) {
      targetDir = srcLibDir;
    } else if (isDirectory(srcDir)) {
      targetDir = srcLibDir; // We'll let writeTextFile create src/lib if needed
    } else if (isDirectory(libDir)) {
      targetDir = libDir;
    } else if (isDirectory(appDir)) {
      targetDir = path.join(projectDir, 'lib');
    } else {
      targetDir = path.join(projectDir, 'lib');
    }
  } else if (options.framework === 'vite' || options.framework === 'cra') {
    fileName = `firebase.${ext}`;
    if (isDirectory(srcLibDir)) {
      targetDir = srcLibDir;
    } else if (isDirectory(srcDir)) {
      targetDir = srcDir;
    }
  } else {
    // Expo / Bare RN
    if (isDirectory(srcDir)) {
      targetDir = srcDir;
    }
  }

  const filePath = path.join(targetDir, fileName);

  if (fileExists(filePath)) {
    warnings.push(`Overwriting existing ${path.relative(projectDir, filePath)}`);
  }

  const content = generateWebConfigFileContent(config, {
    ...options,
    isTypeScript: isTs,
  });

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
