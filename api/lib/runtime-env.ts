import fs from 'fs';
import path from 'path';

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return {} as Record<string, string>;
  const contents = fs.readFileSync(filePath, 'utf8');
  const values: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['\"]|['\"]$/g, '');
    if (key) values[key] = value;
  }
  return values;
}

export function loadRuntimeEnv(source: NodeJS.ProcessEnv = process.env) {
  const rootDir = process.cwd();
  const envFiles = [path.join(rootDir, '.env.local'), path.join(rootDir, '.env')];
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (typeof value === 'string') {
      merged[key] = value;
    }
  }
  for (const filePath of envFiles) {
    const parsed = parseEnvFile(filePath);
    for (const [key, value] of Object.entries(parsed)) {
      if (merged[key] === undefined || merged[key] === '') {
        merged[key] = value;
      }
    }
  }
  return merged as NodeJS.ProcessEnv;
}
