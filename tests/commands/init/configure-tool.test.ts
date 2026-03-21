import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', () => ({
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(() => '{}'),
    writeFileSync: vi.fn(),
}));

vi.mock('@/config', () => ({
    YAVY_BASE_URL: 'https://yavy.dev',
}));

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { ApiProject } from '@/api/client';
import { configureTool } from '@/commands/init/configure-tool';
import { AiTool } from '@/commands/init/types';

function makeProject(overrides: Partial<ApiProject> = {}): ApiProject {
    return {
        id: 1,
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        organization: { name: 'Test Org', slug: 'test-org' },
        pages_count: 42,
        last_indexed_at: '2024-01-01T00:00:00Z',
        has_indexed_content: true,
        context: {
            product: null,
            type: null,
            domain: null,
            version: null,
            complexity: null,
            target_audience: [],
            key_topics: [],
            key_concepts: [],
            example_queries: [],
            related_technologies: [],
            languages: [],
            content_structure: [],
        },
        ...overrides,
    };
}

describe('configureTool', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates skill directory and writes SKILL.md', () => {
        const result = configureTool(AiTool.ClaudeCode, [makeProject()], '/project');

        expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.claude/skills/yavy/projects'), {
            recursive: true,
        });
        expect(writeFileSync).toHaveBeenCalledWith(
            expect.stringContaining('.claude/skills/yavy/SKILL.md'),
            expect.stringContaining('# Yavy Documentation Search'),
            'utf-8',
        );
        expect(result.skillPath).toContain('.claude/skills/yavy/SKILL.md');
    });

    it('writes per-project files', () => {
        const projects = [makeProject({ slug: 'alpha', name: 'Alpha' }), makeProject({ slug: 'beta', name: 'Beta' })];

        const result = configureTool(AiTool.ClaudeCode, projects, '/project');

        expect(result.projectFiles).toHaveLength(2);
        expect(writeFileSync).toHaveBeenCalledWith(expect.stringContaining('projects/alpha.md'), expect.stringContaining('# Alpha'), 'utf-8');
        expect(writeFileSync).toHaveBeenCalledWith(expect.stringContaining('projects/beta.md'), expect.stringContaining('# Beta'), 'utf-8');
    });

    it('does not write MCP config for Claude Code', () => {
        const result = configureTool(AiTool.ClaudeCode, [makeProject()], '/project');

        expect(result.mcpConfigured).toBe(false);
    });

    it('writes MCP config for Cursor', () => {
        const result = configureTool(AiTool.Cursor, [makeProject()], '/project');

        expect(result.mcpConfigured).toBe(true);
        expect(writeFileSync).toHaveBeenCalledWith(expect.stringContaining('.cursor/mcp.json'), expect.any(String), 'utf-8');
    });

    it('merges MCP config additively into existing file', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ servers: { existing: { url: 'http://other' } } }));

        configureTool(AiTool.Cursor, [makeProject()], '/project');

        const mcpWriteCall = vi.mocked(writeFileSync).mock.calls.find((c) => String(c[0]).includes('mcp.json'));
        expect(mcpWriteCall).toBeDefined();
        const written = JSON.parse(mcpWriteCall![1] as string);
        expect(written.servers.existing).toBeDefined();
        expect(written.servers.yavy).toBeDefined();
        expect(written.servers.yavy.url).toContain('yavy.dev/mcp/');
    });

    it('preserves mcpServers key when present in existing config', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ mcpServers: { old: {} } }));

        configureTool(AiTool.Cursor, [makeProject()], '/project');

        const mcpWriteCall = vi.mocked(writeFileSync).mock.calls.find((c) => String(c[0]).includes('mcp.json'));
        const written = JSON.parse(mcpWriteCall![1] as string);
        expect(written.mcpServers.yavy).toBeDefined();
        expect(written.mcpServers.old).toBeDefined();
    });

    it('throws when existing MCP config has invalid JSON', () => {
        vi.mocked(existsSync).mockReturnValueOnce(true);
        vi.mocked(readFileSync).mockReturnValueOnce('not valid json{{{');

        expect(() => configureTool(AiTool.Cursor, [makeProject()], '/project')).toThrow('Failed to parse');
    });

    it('uses correct skill dir per tool', () => {
        configureTool(AiTool.Windsurf, [makeProject()], '/project');

        expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.windsurf/rules/yavy/projects'), {
            recursive: true,
        });
    });

    it('does not write MCP config for Windsurf (global only)', () => {
        const result = configureTool(AiTool.Windsurf, [makeProject()], '/project');

        expect(result.mcpConfigured).toBe(false);
        const mcpWriteCall = vi.mocked(writeFileSync).mock.calls.find((c) => String(c[0]).includes('mcp'));
        expect(mcpWriteCall).toBeUndefined();
    });

    it('writes embedded MCP config for OpenCode', () => {
        const result = configureTool(AiTool.OpenCode, [makeProject()], '/project');

        expect(result.mcpConfigured).toBe(true);
        const mcpWriteCall = vi.mocked(writeFileSync).mock.calls.find((c) => String(c[0]).includes('opencode.json'));
        expect(mcpWriteCall).toBeDefined();
        const written = JSON.parse(mcpWriteCall![1] as string);
        expect(written.mcp.yavy).toBeDefined();
        expect(written.mcp.yavy.url).toContain('yavy.dev/mcp/');
        expect(written.mcp.yavy.type).toBe('remote');
    });

    it('merges embedded MCP config additively for OpenCode', () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ mcp: { existing: { url: 'http://other' } }, theme: 'dark' }));

        configureTool(AiTool.OpenCode, [makeProject()], '/project');

        const mcpWriteCall = vi.mocked(writeFileSync).mock.calls.find((c) => String(c[0]).includes('opencode.json'));
        const written = JSON.parse(mcpWriteCall![1] as string);
        expect(written.mcp.existing).toBeDefined();
        expect(written.mcp.yavy).toBeDefined();
        expect(written.theme).toBe('dark');
    });

    it('uses .github/instructions/yavy/ for VS Code skill dir', () => {
        configureTool(AiTool.Vscode, [makeProject()], '/project');

        expect(mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.github/instructions/yavy/projects'), {
            recursive: true,
        });
    });

    it('includes org slug in MCP URL', () => {
        configureTool(AiTool.Vscode, [makeProject({ organization: { name: 'My Org', slug: 'my-org' } })], '/project');

        const mcpWriteCall = vi.mocked(writeFileSync).mock.calls.find((c) => String(c[0]).includes('mcp.json'));
        const written = JSON.parse(mcpWriteCall![1] as string);
        expect(written.servers.yavy.url).toBe('https://yavy.dev/mcp/my-org');
    });

    it('warns when projects span multiple organizations', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const projects = [
            makeProject({ organization: { name: 'Org A', slug: 'org-a' } }),
            makeProject({ organization: { name: 'Org B', slug: 'org-b' }, slug: 'other-project' }),
        ];

        configureTool(AiTool.Cursor, projects, '/project');

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('multiple organizations'));
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('org-a'));

        warnSpy.mockRestore();
    });
});
