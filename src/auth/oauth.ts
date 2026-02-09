import { createHash, randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { URL } from 'node:url';
import open from 'open';
import { YAVY_BASE_URL, YAVY_CLIENT_ID } from '../config';
import { saveCredentials } from './store';

const PREFERRED_PORTS = [9876, 9877, 9878, 0]; // 0 = OS-assigned fallback
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

function generateState(): string {
    return randomBytes(16).toString('base64url');
}

function tryListen(server: Server, port: number): Promise<number> {
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, () => {
            server.removeListener('error', reject);
            const addr = server.address() as AddressInfo;
            resolve(addr.port);
        });
    });
}

async function listenOnAvailablePort(server: Server): Promise<number> {
    for (const port of PREFERRED_PORTS) {
        try {
            return await tryListen(server, port);
        } catch (err: unknown) {
            if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
                continue;
            }
            throw err;
        }
    }
    throw new Error('Could not find an available port for OAuth callback');
}

export async function performOAuthLogin(): Promise<boolean> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    return new Promise((resolve, reject) => {
        let settled = false;
        const settle = (value: boolean) => {
            if (!settled) {
                settled = true;
                resolve(value);
            }
        };

        const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
            const actualPort = (server.address() as AddressInfo).port;
            const url = new URL(req.url ?? '/', `http://localhost:${actualPort}`);

            if (url.pathname !== CALLBACK_PATH) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }

            const code = url.searchParams.get('code');
            const returnedState = url.searchParams.get('state');
            const error = url.searchParams.get('error');

            if (error || !code) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<html><body><h1>Authentication failed</h1><p>You can close this window.</p></body></html>');
                server.close();
                settle(false);
                return;
            }

            if (returnedState !== state) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<html><body><h1>Authentication failed</h1><p>Invalid state parameter. Possible CSRF attack.</p></body></html>');
                server.close();
                settle(false);
                return;
            }

            try {
                const redirectUri = `http://localhost:${actualPort}${CALLBACK_PATH}`;
                const tokenResponse = await fetch(`${YAVY_BASE_URL}/oauth/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({
                        grant_type: 'authorization_code',
                        code,
                        redirect_uri: redirectUri,
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
                settle(true);
            } catch {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('<html><body><h1>Authentication failed</h1><p>Something went wrong. Please try again.</p></body></html>');
                server.close();
                settle(false);
            }
        });

        listenOnAvailablePort(server)
            .then((actualPort) => {
                const authUrl = new URL('/oauth/authorize', YAVY_BASE_URL);
                authUrl.searchParams.set('client_id', YAVY_CLIENT_ID);
                authUrl.searchParams.set('redirect_uri', `http://localhost:${actualPort}${CALLBACK_PATH}`);
                authUrl.searchParams.set('response_type', 'code');
                authUrl.searchParams.set('state', state);
                authUrl.searchParams.set('code_challenge', codeChallenge);
                authUrl.searchParams.set('code_challenge_method', 'S256');

                open(authUrl.toString());
            })
            .catch((err) => {
                server.close();
                if (!settled) {
                    settled = true;
                    reject(err);
                }
            });

        // Timeout after 5 minutes
        const timeout = setTimeout(
            () => {
                server.close();
                settle(false);
            },
            5 * 60 * 1000,
        );
        timeout.unref();
    });
}
