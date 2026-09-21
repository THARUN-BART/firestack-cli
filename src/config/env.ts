import path from 'node:path';
import { fileExists, readTextFile, writeTextFile } from '../utils/fs';
import type { FirebaseWebConfig, EnvPrefix } from '../types';

export interface EnvConfigResult {
  envFilePath: string;
  created: boolean;
  updated: boolean;
  variablesWritten: Record<string, string>;
  warnings: string[];
}

export function generateEnvVariables(
  config: FirebaseWebConfig,
  prefix: EnvPrefix
): Record<string, string> {
  const vars: Record<string, string> = {
    [`${prefix}FIREBASE_API_KEY`]: config.apiKey,
    [`${prefix}FIREBASE_AUTH_DOMAIN`]: config.authDomain,
    [`${prefix}FIREBASE_PROJECT_ID`]: config.projectId,
    [`${prefix}FIREBASE_STORAGE_BUCKET`]: config.storageBucket,
    [`${prefix}FIREBASE_MESSAGING_SENDER_ID`]: config.messagingSenderId,
    [`${prefix}FIREBASE_APP_ID`]: config.appId,
  };

  if (config.measurementId) {
    vars[`${prefix}FIREBASE_MEASUREMENT_ID`] = config.measurementId;
  }

  return vars;
}

export function ensureGitIgnored(
  projectDir: string,
  patterns: string[] = ['.env', '.env.local', '.env*.local', '.tmp-*']
): { updated: boolean; gitignorePath: string } {
  const gitignorePath = path.join(projectDir, '.gitignore');
  if (!fileExists(gitignorePath)) {
    return { updated: false, gitignorePath };
  }

  const content = readTextFile(gitignorePath) || '';
  const lines = content.split('\n').map((l) => l.trim());

  const missing = patterns.filter((p) => !lines.includes(p));
  if (missing.length === 0) {
    return { updated: false, gitignorePath };
  }

  const updatedContent = content.trimEnd() + '\n\n# Firebase environment & credentials\n' + missing.join('\n') + '\n';
  const written = writeTextFile(gitignorePath, updatedContent);

  return { updated: written, gitignorePath };
}

export function writeFrameworkEnvFile(
  projectDir: string,
  config: FirebaseWebConfig,
  prefix: EnvPrefix,
  preferredFileName: string = '.env'
): EnvConfigResult {
  const warnings: string[] = [];
  const envFilePath = path.join(projectDir, preferredFileName);
  const exists = fileExists(envFilePath);

  const newVars = generateEnvVariables(config, prefix);
  let existingContent = exists ? readTextFile(envFilePath) || '' : '';

  // Parse existing key-values so we can update them in-place or append
  const lines = existingContent.split('\n');
  const existingKeys = new Set<string>();

  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      existingKeys.add(key);
      if (newVars[key] !== undefined) {
        return `${key}="${newVars[key]}"`;
      }
    }
    return line;
  });

  // Append any new keys that were not present in the existing file
  const toAppend: string[] = [];
  let headerAdded = false;

  for (const [key, val] of Object.entries(newVars)) {
    if (!existingKeys.has(key)) {
      if (!headerAdded && !exists) {
        toAppend.push('# Firebase Configuration');
        headerAdded = true;
      } else if (!headerAdded && exists && !existingContent.includes('# Firebase')) {
        toAppend.push('\n# Firebase Configuration');
        headerAdded = true;
      }
      toAppend.push(`${key}="${val}"`);
    }
  }

  let finalContent: string;
  if (exists) {
    finalContent = [...updatedLines, ...toAppend].join('\n').trimEnd() + '\n';
  } else {
    finalContent = toAppend.join('\n') + '\n';
  }

  const written = writeTextFile(envFilePath, finalContent);

  if (!written) {
    warnings.push(`Failed to write environment variables to ${preferredFileName}`);
  }

  // Ensure gitignore covers the environment file
  ensureGitIgnored(projectDir, [preferredFileName, '.env.local', '.env*.local']);

  return {
    envFilePath,
    created: !exists && written,
    updated: exists && written,
    variablesWritten: newVars,
    warnings,
  };
}

