export const YAVY_BASE_URL = process.env.YAVY_BASE_URL ?? 'https://yavy.dev';
export const YAVY_CLIENT_ID = process.env.YAVY_CLIENT_ID ?? '01965e6a-0000-7000-8000-000000000001';
export const YAVY_USER_AGENT = `@yavydev/cli/${process.env.npm_package_version ?? 'unknown'}`;
export const REQUEST_TIMEOUT_MS = 30_000;
export const MAX_RETRIES = 3;
