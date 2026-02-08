import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createMockResponse } from '../__test__/helpers.js';

vi.mock('open', () => ({
    default: vi.fn(),
}));

vi.mock('./store.js', () => ({
    saveCredentials: vi.fn(),
}));

vi.mock('../config.js', () => ({
    YAVY_BASE_URL: 'https://test.yavy.dev',
    YAVY_CLIENT_ID: 'test-client-id',
}));

import openBrowser from 'open';
import { saveCredentials } from './store.js';

// We'll capture the request handler and simulate requests instead of using real HTTP
let requestHandler: (req: IncomingMessage, res: ServerResponse) => void;
let listenCallback: () => void;
let serverClosed: boolean;
let closeCallback: (() => void) | undefined;

vi.mock('node:http', () => ({
    createServer: vi.fn((handler: (req: IncomingMessage, res: ServerResponse) => void) => {
        requestHandler = handler;
        serverClosed = false;
        return {
            listen: vi.fn((_port: number, cb: () => void) => {
                listenCallback = cb;
                // Call listen callback asynchronously to match real behavior
                setTimeout(cb, 0);
            }),
            close: vi.fn((cb?: () => void) => {
                serverClosed = true;
                closeCallback = cb;
                cb?.();
            }),
        };
    }),
}));

// Simulate an incoming request to the handler
function simulateRequest(urlPath: string): { statusCode: number; body: string; headers: Record<string, string> } {
    const result = { statusCode: 200, body: '', headers: {} as Record<string, string> };
    const mockReq = { url: urlPath } as IncomingMessage;
    const mockRes = {
        writeHead: vi.fn((code: number, hdrs?: Record<string, string>) => {
            result.statusCode = code;
            if (hdrs) result.headers = hdrs;
        }),
        end: vi.fn((data?: string) => {
            result.body = data ?? '';
        }),
    } as unknown as ServerResponse;

    requestHandler(mockReq, mockRes);
    return result;
}

// Need dynamic import after mocks are set up
let performOAuthLogin: typeof import('./oauth.js').performOAuthLogin;

beforeEach(async () => {
    vi.clearAllMocks();
    // Reset shared mock state
    requestHandler = undefined as any;
    listenCallback = undefined as any;
    serverClosed = false;
    closeCallback = undefined;
    const mod = await import('./oauth.js');
    performOAuthLogin = mod.performOAuthLogin;
});

describe('performOAuthLogin', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('opens browser with correct authorization URL containing PKCE', async () => {
        vi.mocked(fetch).mockResolvedValue(
            createMockResponse({
                access_token: 'tok',
                refresh_token: 'ref',
                expires_in: 3600,
                token_type: 'Bearer',
            }),
        );

        const loginPromise = performOAuthLogin();
        // Let listen callback fire
        await new Promise((r) => setTimeout(r, 50));

        expect(openBrowser).toHaveBeenCalledOnce();
        const url = new URL(vi.mocked(openBrowser).mock.calls[0][0] as string);
        expect(url.origin).toBe('https://test.yavy.dev');
        expect(url.pathname).toBe('/oauth/authorize');
        expect(url.searchParams.get('client_id')).toBe('test-client-id');
        expect(url.searchParams.get('response_type')).toBe('code');
        expect(url.searchParams.get('code_challenge_method')).toBe('S256');
        expect(url.searchParams.get('code_challenge')).toBeTruthy();
        expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:9876/callback');

        // Simulate callback with auth code
        simulateRequest('/callback?code=auth-code-123');
        // Let the async token exchange resolve
        await new Promise((r) => setTimeout(r, 50));
        const result = await loginPromise;
        expect(result).toBe(true);
    });

    it('exchanges authorization code for tokens on callback', async () => {
        vi.mocked(fetch).mockResolvedValue(
            createMockResponse({
                access_token: 'new-access',
                refresh_token: 'new-refresh',
                expires_in: 7200,
                token_type: 'Bearer',
            }),
        );

        const loginPromise = performOAuthLogin();
        await new Promise((r) => setTimeout(r, 50));

        simulateRequest('/callback?code=test-code');
        await new Promise((r) => setTimeout(r, 50));
        await loginPromise;

        expect(fetch).toHaveBeenCalledWith(
            'https://test.yavy.dev/oauth/token',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
            }),
        );

        const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
        expect(body.grant_type).toBe('authorization_code');
        expect(body.code).toBe('test-code');
        expect(body.client_id).toBe('test-client-id');
        expect(body.code_verifier).toBeTruthy();
    });

    it('calls saveCredentials with the token data', async () => {
        vi.mocked(fetch).mockResolvedValue(
            createMockResponse({
                access_token: 'saved-tok',
                refresh_token: 'saved-ref',
                expires_in: 3600,
                token_type: 'Bearer',
            }),
        );

        const loginPromise = performOAuthLogin();
        await new Promise((r) => setTimeout(r, 50));

        simulateRequest('/callback?code=test-code');
        await new Promise((r) => setTimeout(r, 50));
        await loginPromise;

        expect(saveCredentials).toHaveBeenCalledWith(
            expect.objectContaining({
                access_token: 'saved-tok',
                refresh_token: 'saved-ref',
            }),
        );
    });

    it('returns false when callback has error param', async () => {
        const loginPromise = performOAuthLogin();
        await new Promise((r) => setTimeout(r, 50));

        simulateRequest('/callback?error=access_denied');
        const result = await loginPromise;
        expect(result).toBe(false);
    });

    it('returns false when callback has no code param', async () => {
        const loginPromise = performOAuthLogin();
        await new Promise((r) => setTimeout(r, 50));

        simulateRequest('/callback');
        const result = await loginPromise;
        expect(result).toBe(false);
    });

    it('returns false when token exchange returns non-ok response', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(fetch).mockResolvedValue(createMockResponse({}, 400));

        const loginPromise = performOAuthLogin();
        await new Promise((r) => setTimeout(r, 50));

        simulateRequest('/callback?code=bad-code');
        await new Promise((r) => setTimeout(r, 50));
        const result = await loginPromise;
        expect(result).toBe(false);
    });

    it('returns 404 for non-callback paths', async () => {
        const loginPromise = performOAuthLogin();
        await new Promise((r) => setTimeout(r, 50));

        const response = simulateRequest('/other-path');
        expect(response.statusCode).toBe(404);
        expect(response.body).toBe('Not found');

        // Clean up: trigger callback to resolve the promise
        vi.mocked(fetch).mockResolvedValue(
            createMockResponse({ access_token: 'tok', token_type: 'Bearer' }),
        );
        simulateRequest('/callback?code=cleanup');
        await new Promise((r) => setTimeout(r, 50));
        await loginPromise;
    });

    it('resolves false on 5-minute timeout', async () => {
        vi.useFakeTimers();

        const loginPromise = performOAuthLogin();

        await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);

        const result = await loginPromise;
        expect(result).toBe(false);

        vi.useRealTimers();
    });
});
