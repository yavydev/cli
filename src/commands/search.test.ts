import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchCommand } from './search';

vi.mock('../api/client', () => ({
    YavyApiClient: {
        create: vi.fn(),
    },
}));

vi.mock('../utils/output', () => ({
    error: vi.fn(),
}));

vi.mock('../config', () => ({
    YAVY_BASE_URL: 'https://test.yavy.dev',
    YAVY_USER_AGENT: '@yavydev/cli',
    REQUEST_TIMEOUT_MS: 30_000,
    MAX_RETRIES: 3,
}));

vi.mock('chalk', () => ({
    default: {
        bold: (s: string) => s,
        dim: (s: string) => s,
        cyan: (s: string) => s,
    },
}));

vi.mock('ora', () => ({
    default: vi.fn(() => ({
        start: vi.fn().mockReturnThis(),
        stop: vi.fn(),
    })),
}));

import { type SearchResponse, YavyApiClient } from '../api/client';
import { error } from '../utils/output';

function createMockClient(response: SearchResponse = { data: [], meta: { query: '', total: 0 } }) {
    return {
        listProjects: vi.fn(),
        downloadSkill: vi.fn(),
        search: vi.fn().mockResolvedValue(response),
    };
}

async function run(args: string[]) {
    const cmd = searchCommand();
    cmd.exitOverride();
    cmd.configureOutput({ writeErr: () => {} });
    try {
        await cmd.parseAsync(args, { from: 'user' });
    } catch {
        // Commander throws on exitOverride
    }
}

describe('searchCommand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    it('shows formatted search results', async () => {
        const response = {
            data: [
                {
                    title: 'Auth Guide',
                    url: 'https://docs.example.com/auth',
                    content: 'How to authenticate API requests',
                    project: 'my-org/my-docs',
                },
            ],
            meta: { query: 'auth', total: 1 },
        };
        const mockClient = createMockClient(response);
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['auth']);

        expect(mockClient.search).toHaveBeenCalledWith('auth', { project: undefined, limit: 10 });
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1 result(s)'));
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Auth Guide'));
    });

    it('shows "No results found" for empty response', async () => {
        vi.mocked(YavyApiClient.create).mockResolvedValue(createMockClient() as unknown as YavyApiClient);

        await run(['nonexistent']);

        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No results found'));
    });

    it('outputs JSON when --json flag is used', async () => {
        const response = {
            data: [{ title: 'Test', url: 'https://example.com', content: 'content', project: 'org/proj' }],
            meta: { query: 'test', total: 1 },
        };
        vi.mocked(YavyApiClient.create).mockResolvedValue(createMockClient(response) as unknown as YavyApiClient);

        await run(['test', '--json']);

        const logCall = vi.mocked(console.log).mock.calls[0][0] as string;
        const parsed = JSON.parse(logCall);
        expect(parsed.data).toHaveLength(1);
        expect(parsed.meta.total).toBe(1);
    });

    it('passes --project option to API client', async () => {
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['test', '--project', 'my-org/my-docs']);

        expect(mockClient.search).toHaveBeenCalledWith('test', { project: 'my-org/my-docs', limit: 10 });
    });

    it('passes --limit option to API client', async () => {
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['test', '--limit', '5']);

        expect(mockClient.search).toHaveBeenCalledWith('test', { project: undefined, limit: 5 });
    });

    it('shows error and exits on API failure', async () => {
        vi.mocked(YavyApiClient.create).mockRejectedValue(new Error('Connection failed'));

        await run(['test']);

        expect(error).toHaveBeenCalledWith('Connection failed');
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('truncates long content in human output', async () => {
        const longContent = 'A'.repeat(300);
        const response = {
            data: [{ title: 'Test', url: 'https://example.com', content: longContent, project: 'org/proj' }],
            meta: { query: 'test', total: 1 },
        };
        vi.mocked(YavyApiClient.create).mockResolvedValue(createMockClient(response) as unknown as YavyApiClient);

        await run(['test']);

        const calls = vi.mocked(console.log).mock.calls.map((c) => String(c[0]));
        const snippetCall = calls.find((c) => c.includes('AAA'));
        expect(snippetCall).toBeDefined();
        expect(snippetCall!.length).toBeLessThan(longContent.length);
    });
});
