import { describe, it, expect, vi, beforeEach } from 'vitest';
import { success, error, info } from './output.js';

vi.mock('chalk', () => ({
    default: {
        green: (s: string) => s,
        red: (s: string) => s,
        blue: (s: string) => s,
    },
}));

describe('output utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('success() calls console.log with message', () => {
        success('it worked');
        expect(console.log).toHaveBeenCalledOnce();
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('it worked'));
    });

    it('error() calls console.error with message', () => {
        error('it failed');
        expect(console.error).toHaveBeenCalledOnce();
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('it failed'));
    });

    it('info() calls console.log with message', () => {
        info('some info');
        expect(console.log).toHaveBeenCalledOnce();
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('some info'));
    });

    it('success() includes check mark symbol', () => {
        success('done');
        const call = vi.mocked(console.log).mock.calls[0][0] as string;
        expect(call).toContain('✓');
    });

    it('error() includes cross mark symbol', () => {
        error('oops');
        const call = vi.mocked(console.error).mock.calls[0][0] as string;
        expect(call).toContain('✗');
    });

    it('info() includes info symbol', () => {
        info('note');
        const call = vi.mocked(console.log).mock.calls[0][0] as string;
        expect(call).toContain('ℹ');
    });
});
