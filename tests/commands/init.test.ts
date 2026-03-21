import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/client', () => ({
    YavyApiClient: vi.fn().mockImplementation(function () {
        return { listProjects: vi.fn().mockResolvedValue([]) };
    }),
}));

vi.mock('@/auth/store', () => ({
    getAccessToken: vi.fn(() => Promise.resolve('test-token')),
}));

vi.mock('@/utils/output', () => ({
    error: vi.fn(),
}));

vi.mock('@/commands/init/scan-tools', () => ({
    scanForTools: vi.fn(() => []),
    resolveToolFromFlag: vi.fn(),
}));

vi.mock('@/commands/init/configure-tool', () => ({
    configureTool: vi.fn(() => ({
        tool: 'claude-code',
        skillPath: '/project/.claude/skills/yavy/SKILL.md',
        mcpConfigured: false,
        projectFiles: ['/project/.claude/skills/yavy/projects/test.md'],
    })),
}));

vi.mock('@clack/prompts', () => ({
    intro: vi.fn(),
    outro: vi.fn(),
    cancel: vi.fn(),
    spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
    multiselect: vi.fn(),
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    note: vi.fn(),
    isCancel: vi.fn(() => false),
}));

vi.mock('chalk', () => ({
    default: {
        bold: (s: string) => s,
        cyan: (s: string) => s,
    },
}));

import * as p from '@clack/prompts';
import type { ApiProject } from '@/api/client';
import { YavyApiClient } from '@/api/client';
import { getAccessToken } from '@/auth/store';
import { error } from '@/utils/output';
import { initCommand } from '@/commands/init';
import { configureTool } from '@/commands/init/configure-tool';
import { resolveToolFromFlag, scanForTools } from '@/commands/init/scan-tools';
import { AiTool } from '@/commands/init/types';

function makeProject(overrides: Partial<ApiProject> = {}): ApiProject {
    return {
        id: 1,
        name: 'Test Project',
        slug: 'test-project',
        description: null,
        organization: { name: 'Test Org', slug: 'test-org' },
        pages_count: 42,
        last_indexed_at: '2024-01-01T00:00:00Z',
        has_indexed_content: true,
        ...overrides,
    };
}

function mockClient(projects: ApiProject[] = []) {
    vi.mocked(YavyApiClient).mockImplementation(function () {
        return { listProjects: vi.fn().mockResolvedValue(projects) } as unknown as YavyApiClient;
    });
}

async function run(args: string[] = []) {
    const cmd = initCommand();
    cmd.exitOverride();
    cmd.configureOutput({ writeErr: () => {} });
    try {
        await cmd.parseAsync(args, { from: 'user' });
    } catch {
        // Commander throws on exitOverride
    }
}

describe('initCommand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
        vi.spyOn(process, 'cwd').mockReturnValue('/project');
    });

    it('exits when not authenticated', async () => {
        vi.mocked(getAccessToken).mockResolvedValue(null);

        await run();

        expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining('Not authenticated'));
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('uses --tool flag to select specific tool', async () => {
        vi.mocked(resolveToolFromFlag).mockReturnValue(AiTool.ClaudeCode);
        mockClient([makeProject()]);
        vi.mocked(p.multiselect).mockResolvedValue(['test-project']);

        await run(['--tool', 'claude-code']);

        expect(resolveToolFromFlag).toHaveBeenCalledWith('claude-code');
        expect(configureTool).toHaveBeenCalledWith(AiTool.ClaudeCode, expect.any(Array), '/project');
    });

    it('exits with error for unknown --tool', async () => {
        vi.mocked(resolveToolFromFlag).mockReturnValue(null);

        await run(['--tool', 'unknown']);

        expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining('Unknown tool'));
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('shows outro when no indexed projects found', async () => {
        vi.mocked(scanForTools).mockReturnValue([AiTool.ClaudeCode]);
        vi.mocked(p.multiselect).mockResolvedValueOnce([AiTool.ClaudeCode]);
        mockClient([]);

        await run();

        expect(p.outro).toHaveBeenCalledWith(expect.stringContaining('No indexed projects'));
    });

    it('auto-selects all tools and projects with --yes', async () => {
        vi.mocked(scanForTools).mockReturnValue([AiTool.ClaudeCode, AiTool.Cursor]);
        mockClient([makeProject()]);

        await run(['--yes']);

        expect(p.multiselect).not.toHaveBeenCalled();
        expect(configureTool).toHaveBeenCalledTimes(2);
    });

    it('filters projects to only indexed ones', async () => {
        vi.mocked(scanForTools).mockReturnValue([AiTool.ClaudeCode]);
        vi.mocked(p.multiselect)
            .mockResolvedValueOnce([AiTool.ClaudeCode])
            .mockResolvedValueOnce(['indexed-proj']);

        mockClient([
            makeProject({ slug: 'indexed-proj', has_indexed_content: true }),
            makeProject({ slug: 'not-indexed', has_indexed_content: false }),
        ]);

        await run();

        const projectSelectCall = vi.mocked(p.multiselect).mock.calls[1];
        const options = projectSelectCall[0].options as Array<{ value: string }>;
        expect(options).toHaveLength(1);
        expect(options[0].value).toBe('indexed-proj');
    });

    it('shows summary after successful configuration', async () => {
        vi.mocked(scanForTools).mockReturnValue([AiTool.ClaudeCode]);
        mockClient([makeProject()]);

        await run(['--yes']);

        expect(p.note).toHaveBeenCalled();
        expect(p.outro).toHaveBeenCalledWith(expect.stringContaining('1 tool(s)'));
    });
});
