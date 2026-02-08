import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getSkillOutputPath, ensureParentDir } from './paths.js';

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

describe('getSkillOutputPath', () => {
    it('returns options.output directly when --output is provided', () => {
        const result = getSkillOutputPath('my-project', { output: '/custom/path.md' });
        expect(result).toBe('/custom/path.md');
    });

    it('returns global path when --global is true', () => {
        const result = getSkillOutputPath('my-project', { global: true });
        expect(result).toBe(join('/mock-home', '.claude', 'skills', 'my-project', 'SKILL.md'));
    });

    it('returns cwd-based path with no options', () => {
        const result = getSkillOutputPath('my-project', {});
        expect(result).toBe(join(process.cwd(), '.claude', 'skills', 'my-project', 'SKILL.md'));
    });

    it('handles org/project slug in path', () => {
        const result = getSkillOutputPath('my-org/my-project', { global: true });
        expect(result).toBe(join('/mock-home', '.claude', 'skills', 'my-org/my-project', 'SKILL.md'));
    });
});

describe('ensureParentDir', () => {
    it('calls mkdirSync with recursive when dir does not exist', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        ensureParentDir('/some/nested/dir/file.md');
        expect(mkdirSync).toHaveBeenCalledWith('/some/nested/dir', { recursive: true });
    });

    it('skips mkdirSync when dir already exists', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        ensureParentDir('/existing/dir/file.md');
        expect(mkdirSync).not.toHaveBeenCalled();
    });
});
