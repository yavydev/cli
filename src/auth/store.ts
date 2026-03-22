import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { YAVY_BASE_URL, YAVY_CLIENT_ID } from '@/config';

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

export interface Credentials {
    access_token: string;
    refresh_token?: string;
    expires_at?: string;
}

function credentialsPath(): string {
    return join(homedir(), '.yavy', 'credentials.json');
}

export function loadCredentials(): Credentials | null {
    const path = credentialsPath();
    if (!existsSync(path)) return null;
    try {
        return JSON.parse(readFileSync(path, 'utf-8')) as Credentials;
    } catch {
        return null;
    }
}

export function saveCredentials(creds: Credentials): void {
    const dir = join(homedir(), '.yavy');
    mkdirSync(dir, { recursive: true });
    writeFileSync(credentialsPath(), JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function clearCredentials(): void {
    const path = credentialsPath();
    if (existsSync(path)) unlinkSync(path);
}

export function isExpired(creds: Credentials): boolean {
    if (!creds.expires_at) return false;
    return new Date(creds.expires_at).getTime() - Date.now() <= REFRESH_BUFFER_MS;
}

async function refreshToken(token: string): Promise<Credentials | null> {
    try {
        const response = await fetch(`${YAVY_BASE_URL}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                grant_type: 'refresh_token',
                refresh_token: token,
                client_id: YAVY_CLIENT_ID,
            }),
        });

        if (!response.ok) return null;

        const data = (await response.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
        const newCreds: Credentials = {
            access_token: data.access_token,
            refresh_token: data.refresh_token ?? token,
            expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
        };

        saveCredentials(newCreds);
        return newCreds;
    } catch {
        return null;
    }
}

export async function getAccessToken(): Promise<string | null> {
    const creds = loadCredentials();
    if (!creds) return null;

    if (isExpired(creds)) {
        if (!creds.refresh_token) return null;
        const refreshed = await refreshToken(creds.refresh_token);
        return refreshed?.access_token ?? null;
    }

    return creds.access_token;
}
