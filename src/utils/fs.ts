import fs from 'node:fs';
import path from 'node:path';

export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function isDirectory(dirPath: string): boolean {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

export function readTextFile(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export function writeTextFile(filePath: string, content: string): boolean {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

export function readJsonFile<T = any>(filePath: string): T | null {
  const content = readTextFile(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function writeJsonFile(filePath: string, data: any): boolean {
  try {
    const formatted = JSON.stringify(data, null, 2) + '\n';
    return writeTextFile(filePath, formatted);
  } catch {
    return false;
  }
}

/**
 * Backup a file before overwriting it. Creates <filePath>.bak if the file
 * exists. Returns the backup path, or null if no backup was needed.
 * Note: .bak files must be listed in .gitignore to prevent credential leaks.
 */
export function backupIfExists(filePath: string): string | null {
  if (!fileExists(filePath)) return null;
  const backupPath = filePath + '.bak';
  try {
    const content = readTextFile(filePath);
    if (content) {
      writeTextFile(backupPath, content);
      return backupPath;
    }
  } catch {
    // Non-fatal: proceed without backup
  }
  return null;
}
