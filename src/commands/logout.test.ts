import { describe, expect, it, vi } from 'vitest';
import { logoutCommand } from './logout';

vi.mock('../auth/store', () => ({
    loadCredentials: vi.fn(),
    clearCredentials: vi.fn(),
}));

vi.mock('../utils/output', () => ({
    info: vi.fn(),
    success: vi.fn(),
}));

import { clearCredentials, loadCredentials } from '../auth/store';
import { info, success } from '../utils/output';

function run() {
    const cmd = logoutCommand();
    cmd.exitOverride();
    cmd.configureOutput({ writeErr: () => {} });
    try {
        cmd.parse([], { from: 'user' });
    } catch {
        // Commander throws on exitOverride
    }
}

describe('logoutCommand', () => {
    it('shows "not logged in" when no credentials', () => {
        vi.mocked(loadCredentials).mockReturnValue(null);

        run();

        expect(info).toHaveBeenCalledWith(expect.stringContaining('not logged in'));
        expect(clearCredentials).not.toHaveBeenCalled();
    });

    it('calls clearCredentials and shows success when logged in', () => {
        vi.mocked(loadCredentials).mockReturnValue({ access_token: 'tok' });

        run();

        expect(clearCredentials).toHaveBeenCalledOnce();
        expect(success).toHaveBeenCalledWith(expect.stringContaining('Logged out'));
    });

    it('does not call clearCredentials when no credentials exist', () => {
        vi.mocked(loadCredentials).mockReturnValue(null);

        run();

        expect(clearCredentials).not.toHaveBeenCalled();
    });

    it('shows appropriate message for each state', () => {
        // Logged in state
        vi.mocked(loadCredentials).mockReturnValue({ access_token: 'tok' });
        run();
        expect(success).toHaveBeenCalled();

        vi.clearAllMocks();

        // Logged out state
        vi.mocked(loadCredentials).mockReturnValue(null);
        run();
        expect(info).toHaveBeenCalled();
    });
});
