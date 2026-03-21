import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureDir, getSkillOutputDir, isPathSafe } from '@/utils/paths';

vi.mock('node:fs', () => ({
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
    it('calls mkdirSync with recursive unconditionally', () => {
        ensureDir('/some/nested/dir');
        expect(mkdirSync).toHaveBeenCalledWith('/some/nested/dir', { recursive: true });
    });
});

describe('isPathSafe', () => {
    it('returns true for normal relative paths', () => {
        expect(isPathSafe('SKILL.md', '/output')).toBe(true);
        expect(isPathSafe('references/doc.md', '/output')).toBe(true);
    });

    it('returns false for paths with ../ traversal', () => {
        expect(isPathSafe('../../../etc/passwd', '/output')).toBe(false);
        expect(isPathSafe('references/../../secret.txt', '/output')).toBe(false);
    });

    it('returns false for paths with null bytes', () => {
        expect(isPathSafe('file\0.md', '/output')).toBe(false);
    });

    it('returns true for deeply nested safe paths', () => {
        expect(isPathSafe('a/b/c/d/file.md', '/output')).toBe(true);
    });

    it('returns false for absolute path escapes', () => {
        expect(isPathSafe('/etc/passwd', '/output')).toBe(false);
    });
});
