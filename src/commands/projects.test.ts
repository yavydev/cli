import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectsCommand } from './projects.js';

vi.mock('../api/client.js', () => ({
    YavyApiClient: {
        create: vi.fn(),
    },
}));

vi.mock('../utils/output.js', () => ({
    error: vi.fn(),
}));

vi.mock('../config.js', () => ({
    YAVY_BASE_URL: 'https://test.yavy.dev',
}));

vi.mock('chalk', () => ({
    default: {
        bold: (s: string) => s,
        dim: (s: string) => s,
        cyan: (s: string) => s,
        yellow: (s: string) => s,
        green: (s: string) => s,
    },
}));

vi.mock('ora', () => ({
    default: vi.fn(() => ({
        start: vi.fn().mockReturnThis(),
        stop: vi.fn(),
        fail: vi.fn(),
    })),
}));

import { YavyApiClient } from '../api/client.js';
import { error } from '../utils/output.js';

function createMockClient(projects: unknown[] = []) {
    return {
        listProjects: vi.fn().mockResolvedValue(projects),
        downloadSkill: vi.fn(),
    };
}

async function run(opts: string[] = []) {
    const cmd = projectsCommand();
    cmd.exitOverride();
    cmd.configureOutput({ writeErr: () => {} });
    try {
        await cmd.parseAsync(opts, { from: 'user' });
    } catch {
        // Commander throws on exitOverride
    }
}

describe('projectsCommand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    it('shows formatted project list', async () => {
        const projects = [
            {
                id: 1,
                name: 'My Project',
                slug: 'my-project',
                description: null,
                organization: { name: 'My Org', slug: 'my-org' },
                pages_count: 10,
                last_indexed_at: '2024-01-01T00:00:00Z',
                has_indexed_content: true,
            },
        ];
        vi.mocked(YavyApiClient.create).mockResolvedValue(createMockClient(projects) as unknown as YavyApiClient);

        await run();

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Your Projects'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('My Project'));
    });

    it('shows "No projects found" when empty', async () => {
        vi.mocked(YavyApiClient.create).mockResolvedValue(createMockClient([]) as unknown as YavyApiClient);

        await run();

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No projects found'));
    });

    it('outputs JSON when --json flag is used', async () => {
        const projects = [{ id: 1, name: 'Test' }];
        vi.mocked(YavyApiClient.create).mockResolvedValue(createMockClient(projects) as unknown as YavyApiClient);

        await run(['--json']);

        const logCall = vi.mocked(console.log).mock.calls[0][0] as string;
        const parsed = JSON.parse(logCall);
        expect(parsed).toEqual(projects);
    });

    it('shows error and exits on API failure', async () => {
        vi.mocked(YavyApiClient.create).mockRejectedValue(new Error('Connection failed'));

        await run();

        expect(error).toHaveBeenCalledWith('Connection failed');
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('shows "not indexed" for projects without last_indexed_at', async () => {
        const projects = [
            {
                id: 1,
                name: 'Unindexed',
                slug: 'unindexed',
                description: null,
                organization: { name: 'Org', slug: 'org' },
                pages_count: 0,
                last_indexed_at: null,
                has_indexed_content: false,
            },
        ];
        vi.mocked(YavyApiClient.create).mockResolvedValue(createMockClient(projects) as unknown as YavyApiClient);

        await run();

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('not indexed'));
    });
});
