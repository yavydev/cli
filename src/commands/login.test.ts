import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginCommand } from './login.js';

vi.mock('../auth/oauth.js', () => ({
    performOAuthLogin: vi.fn(),
}));

vi.mock('../auth/store.js', () => ({
    loadCredentials: vi.fn(),
}));

vi.mock('../utils/output.js', () => ({
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
}));

vi.mock('ora', () => ({
    default: vi.fn(() => ({
        start: vi.fn().mockReturnThis(),
        stop: vi.fn(),
        fail: vi.fn(),
    })),
}));

import { performOAuthLogin } from '../auth/oauth.js';
import { loadCredentials } from '../auth/store.js';
import { info, success, error } from '../utils/output.js';

async function run() {
    const cmd = loginCommand();
    cmd.exitOverride();
    cmd.configureOutput({ writeErr: () => {} });
    try {
        await cmd.parseAsync([], { from: 'user' });
    } catch {
        // Commander throws on exitOverride
    }
}

describe('loginCommand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    it('skips OAuth when already logged in', async () => {
        vi.mocked(loadCredentials).mockReturnValue({ access_token: 'existing-tok' });

        await run();

        expect(info).toHaveBeenCalledWith(expect.stringContaining('already logged in'));
        expect(performOAuthLogin).not.toHaveBeenCalled();
    });

    it('calls performOAuthLogin when not logged in', async () => {
        vi.mocked(loadCredentials).mockReturnValue(null);
        vi.mocked(performOAuthLogin).mockResolvedValue(true);

        await run();

        expect(performOAuthLogin).toHaveBeenCalledOnce();
    });

    it('shows success message on successful login', async () => {
        vi.mocked(loadCredentials).mockReturnValue(null);
        vi.mocked(performOAuthLogin).mockResolvedValue(true);

        await run();

        expect(success).toHaveBeenCalledWith(expect.stringContaining('Successfully logged in'));
    });

    it('shows error message on failed login', async () => {
        vi.mocked(loadCredentials).mockReturnValue(null);
        vi.mocked(performOAuthLogin).mockResolvedValue(false);

        await run();

        expect(error).toHaveBeenCalledWith(expect.stringContaining('Login failed'));
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('shows error message when OAuth throws', async () => {
        vi.mocked(loadCredentials).mockReturnValue(null);
        vi.mocked(performOAuthLogin).mockRejectedValue(new Error('Port in use'));

        await run();

        expect(error).toHaveBeenCalledWith(expect.stringContaining('Port in use'));
        expect(process.exit).toHaveBeenCalledWith(1);
    });
});
