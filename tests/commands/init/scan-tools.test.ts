import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
    existsSync: vi.fn(() => false),
}));

import { existsSync } from 'node:fs';
import { resolveToolFromFlag, scanForTools } from '@/commands/init/scan-tools';
import { AiTool } from '@/commands/init/types';

describe('scanForTools', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns empty array when no tool directories exist', () => {
        vi.mocked(existsSync).mockReturnValue(false);
        expect(scanForTools('/project')).toEqual([]);
    });

    it('detects Claude Code when .claude/ exists', () => {
        vi.mocked(existsSync).mockImplementation((path) => String(path).includes('.claude'));
        expect(scanForTools('/project')).toEqual([AiTool.ClaudeCode]);
    });

    it('detects multiple tools', () => {
        vi.mocked(existsSync).mockImplementation((path) => {
            const p = String(path);
            return p.includes('.claude') || p.includes('.cursor') || p.includes('.vscode');
        });
        expect(scanForTools('/project')).toEqual([AiTool.ClaudeCode, AiTool.Cursor, AiTool.Vscode]);
    });

    it('detects all scannable tools', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        expect(scanForTools('/project')).toEqual([AiTool.ClaudeCode, AiTool.Cursor, AiTool.Vscode, AiTool.Windsurf, AiTool.OpenCode]);
    });

});

describe('resolveToolFromFlag', () => {
    it('resolves exact enum values', () => {
        expect(resolveToolFromFlag('claude-code')).toBe(AiTool.ClaudeCode);
        expect(resolveToolFromFlag('cursor')).toBe(AiTool.Cursor);
        expect(resolveToolFromFlag('vscode')).toBe(AiTool.Vscode);
        expect(resolveToolFromFlag('windsurf')).toBe(AiTool.Windsurf);
        expect(resolveToolFromFlag('opencode')).toBe(AiTool.OpenCode);
    });

    it('resolves display names case-insensitively', () => {
        expect(resolveToolFromFlag('Claude Code')).toBe(AiTool.ClaudeCode);
        expect(resolveToolFromFlag('VS Code')).toBe(AiTool.Vscode);
    });

    it('returns null for unknown tools', () => {
        expect(resolveToolFromFlag('unknown')).toBeNull();
        expect(resolveToolFromFlag('vim')).toBeNull();
    });
});
