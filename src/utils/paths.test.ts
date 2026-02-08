import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getSkillOutputDir, ensureDir, ensureParentDir } from './paths.js';

vi.mock('node:fs', () => ({
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
}));

vi.mock('node:os', () => ({
    homedir: vi.fn(() => '/mock-home'),
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('getSkillOutputDir', () => {
    it('returns options.output directly when --output is provided', () => {
        const result = getSkillOutputDir('my-project', { output: '/custom/path' });
        expect(result).toBe('/custom/path');
    });

    it('returns global path when --global is true', () => {
        const result = getSkillOutputDir('my-project', { global: true });
        expect(result).toBe(join('/mock-home', '.claude', 'skills', 'my-project'));
    });

    it('returns cwd-based path with no options', () => {
        const result = getSkillOutputDir('my-project', {});
        expect(result).toBe(join(process.cwd(), '.claude', 'skills', 'my-project'));
    });
});

describe('ensureDir', () => {
    it('calls mkdirSync with recursive when dir does not exist', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        ensureDir('/some/nested/dir');
        expect(mkdirSync).toHaveBeenCalledWith('/some/nested/dir', { recursive: true });
    });

    it('skips mkdirSync when dir already exists', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        ensureDir('/existing/dir');
        expect(mkdirSync).not.toHaveBeenCalled();
    });
});

describe('ensureParentDir', () => {
    it('calls mkdirSync for parent directory', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        ensureParentDir('/some/nested/dir/file.md');
        expect(mkdirSync).toHaveBeenCalledWith('/some/nested/dir', { recursive: true });
    });
});
