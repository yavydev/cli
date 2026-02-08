import { createHash, randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import open from 'open';
import { saveCredentials } from './store.js';
import { YAVY_BASE_URL, YAVY_CLIENT_ID } from '../config.js';
const CALLBACK_PORT = 9876;
const CALLBACK_PATH = '/callback';

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type: string;
}

function generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url');
}

export async function performOAuthLogin(): Promise<boolean> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    return new Promise((resolve) => {
        const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
            const url = new URL(req.url ?? '/', `http://localhost:${CALLBACK_PORT}`);

            if (url.pathname !== CALLBACK_PATH) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }

            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (error || !code) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<html><body><h1>Authentication failed</h1><p>You can close this window.</p></body></html>');
                server.close();
                resolve(false);
                return;
            }

            try {
                // Exchange code for token
                const tokenResponse = await fetch(`${YAVY_BASE_URL}/oauth/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({
                        grant_type: 'authorization_code',
                        code,
                        redirect_uri: `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`,
                        client_id: YAVY_CLIENT_ID,
                        code_verifier: codeVerifier,
                    }),
                });

                if (!tokenResponse.ok) {
                    throw new Error(`Token exchange failed: ${tokenResponse.status}`);
                }

                const data = (await tokenResponse.json()) as TokenResponse;

                saveCredentials({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
                });

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<html><body><h1>Logged in to Yavy!</h1><p>You can close this window and return to your terminal.</p></body></html>');
                server.close();
                resolve(true);
            } catch (err) {
                console.error('Token exchange failed:', err instanceof Error ? err.message : err);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<html><body><h1>Authentication failed</h1><p>Something went wrong. Please try again.</p></body></html>');
                server.close();
                resolve(false);
            }
        });

        server.listen(CALLBACK_PORT, () => {
            const authUrl = new URL('/oauth/authorize', YAVY_BASE_URL);
            authUrl.searchParams.set('client_id', YAVY_CLIENT_ID);
            authUrl.searchParams.set('redirect_uri', `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`);
            authUrl.searchParams.set('response_type', 'code');
            authUrl.searchParams.set('scope', '');
            authUrl.searchParams.set('code_challenge', codeChallenge);
            authUrl.searchParams.set('code_challenge_method', 'S256');

            open(authUrl.toString());
        });

        // Timeout after 5 minutes
        const timeout = setTimeout(
            () => {
                server.close();
                resolve(false);
            },
            5 * 60 * 1000,
        );
        timeout.unref();
    });
}
