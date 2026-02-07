import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface Credentials {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
}

function credentialsPath(): string {
  return join(homedir(), '.yavy', 'credentials.json');
}

function ensureDir(): void {
  const dir = join(homedir(), '.yavy');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function loadCredentials(): Credentials | null {
  const path = credentialsPath();
  if (!existsSync(path)) {
    return null;
  }
  try {
    const data = readFileSync(path, 'utf-8');
    return JSON.parse(data) as Credentials;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: Credentials): void {
  ensureDir();
  writeFileSync(credentialsPath(), JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function clearCredentials(): void {
  const path = credentialsPath();
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

export function getAccessToken(): string | null {
  const creds = loadCredentials();
  if (!creds) return null;

  // Check expiration if set
  if (creds.expires_at) {
    const expiresAt = new Date(creds.expires_at);
    if (expiresAt <= new Date()) {
      return null; // Token expired
    }
  }

  return creds.access_token;
}
