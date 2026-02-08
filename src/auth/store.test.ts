import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createMockResponse } from '../__test__/helpers.js';
import { loadCredentials, saveCredentials, clearCredentials, getAccessToken, type Credentials } from './store.js';

vi.mock('node:fs', () => ({
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    writeFileSync: vi.fn(),
}));

vi.mock('node:os', () => ({
    homedir: vi.fn(() => '/mock-home'),
}));

vi.mock('../config.js', () => ({
    YAVY_BASE_URL: 'https://test.yavy.dev',
    YAVY_CLIENT_ID: 'test-client-id',
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('loadCredentials', () => {
    it('returns null when file does not exist', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        expect(loadCredentials()).toBeNull();
    });

    it('returns parsed credentials when file is valid JSON', () => {
        const creds: Credentials = { access_token: 'tok123', refresh_token: 'ref456' };
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify(creds));
        expect(loadCredentials()).toEqual(creds);
    });

    it('returns null on invalid JSON', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('not json{{{');
        expect(loadCredentials()).toBeNull();
    });
});

describe('saveCredentials', () => {
    it('creates ~/.yavy directory if it does not exist', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        saveCredentials({ access_token: 'tok' });
        expect(mkdirSync).toHaveBeenCalledWith('/mock-home/.yavy', { recursive: true });
    });

    it('writes JSON with mode 0o600', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        const creds: Credentials = { access_token: 'tok' };
        saveCredentials(creds);
        expect(writeFileSync).toHaveBeenCalledWith(
            '/mock-home/.yavy/credentials.json',
            JSON.stringify(creds, null, 2),
            { mode: 0o600 },
        );
    });

    it('skips mkdir when directory already exists', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        saveCredentials({ access_token: 'tok' });
        expect(mkdirSync).not.toHaveBeenCalled();
    });
});

describe('clearCredentials', () => {
    it('calls unlinkSync when file exists', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        clearCredentials();
        expect(unlinkSync).toHaveBeenCalledWith('/mock-home/.yavy/credentials.json');
    });

    it('no-op when file does not exist', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        clearCredentials();
        expect(unlinkSync).not.toHaveBeenCalled();
    });
});

describe('getAccessToken', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', vi.fn());
    });

    it('returns null when no credentials stored', async () => {
        vi.mocked(existsSync).mockReturnValue(false);
        expect(await getAccessToken()).toBeNull();
    });

    it('returns access_token when not expired', async () => {
        const future = new Date(Date.now() + 3600 * 1000).toISOString();
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({ access_token: 'valid-tok', expires_at: future }),
        );
        expect(await getAccessToken()).toBe('valid-tok');
    });

    it('returns access_token when no expires_at field', async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({ access_token: 'no-expiry-tok' }),
        );
        expect(await getAccessToken()).toBe('no-expiry-tok');
    });

    it('returns null when expired with no refresh_token', async () => {
        const past = new Date(Date.now() - 3600 * 1000).toISOString();
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({ access_token: 'expired-tok', expires_at: past }),
        );
        expect(await getAccessToken()).toBeNull();
    });

    it('refreshes token when expired with refresh_token', async () => {
        const past = new Date(Date.now() - 3600 * 1000).toISOString();
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({ access_token: 'old', refresh_token: 'ref-tok', expires_at: past }),
        );

        vi.mocked(fetch).mockResolvedValue(
            createMockResponse({ access_token: 'new-tok', refresh_token: 'new-ref', expires_in: 3600 }),
        );

        const token = await getAccessToken();
        expect(token).toBe('new-tok');
        expect(fetch).toHaveBeenCalledWith(
            'https://test.yavy.dev/oauth/token',
            expect.objectContaining({ method: 'POST' }),
        );
        expect(writeFileSync).toHaveBeenCalledWith(
            '/mock-home/.yavy/credentials.json',
            expect.stringContaining('"access_token": "new-tok"'),
            { mode: 0o600 },
        );
    });

    it('returns null when refresh fails with non-ok response', async () => {
        const past = new Date(Date.now() - 3600 * 1000).toISOString();
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({ access_token: 'old', refresh_token: 'ref-tok', expires_at: past }),
        );

        vi.mocked(fetch).mockResolvedValue(createMockResponse({}, 401));
        expect(await getAccessToken()).toBeNull();
    });

    it('returns null when refresh throws network error', async () => {
        const past = new Date(Date.now() - 3600 * 1000).toISOString();
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(
            JSON.stringify({ access_token: 'old', refresh_token: 'ref-tok', expires_at: past }),
        );

        vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
        expect(await getAccessToken()).toBeNull();
    });
});
