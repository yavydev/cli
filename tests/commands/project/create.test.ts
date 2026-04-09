import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeCreateProject } from '@/commands/project/create';

vi.mock('@/auth/store', () => ({
    getAccessToken: vi.fn(),
}));

vi.mock('@/config', () => ({
    YAVY_BASE_URL: 'https://test.yavy.dev',
    YAVY_CLIENT_ID: 'test-client-id',
    YAVY_USER_AGENT: '@yavydev/cli',
    REQUEST_TIMEOUT_MS: 30_000,
    MAX_RETRIES: 3,
}));

vi.mock('@/prompts/project-create', () => ({
    needsInteractiveMode: vi.fn(),
    runInteractiveFlow: vi.fn(),
}));

import { getAccessToken } from '@/auth/store';
import { needsInteractiveMode, runInteractiveFlow } from '@/prompts/project-create';

function mockFetchResponse(status: number, body: unknown): void {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
        headers: new Headers(),
    }));
}

describe('executeCreateProject', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.mocked(needsInteractiveMode).mockReturnValue(false);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('throws when no token is available', async () => {
        vi.mocked(getAccessToken).mockResolvedValue(null);

        await expect(executeCreateProject({ url: 'https://docs.example.com' }))
            .rejects.toThrow('Not authenticated');
    });

    it('throws when both --url and --github are provided', async () => {
        vi.mocked(getAccessToken).mockResolvedValue('test-token');
        mockFetchResponse(200, { data: [] });

        await expect(executeCreateProject({
            url: 'https://docs.example.com',
            github: 'owner/repo',
        })).rejects.toThrow('not both');
    });

    it('throws when no source is provided and interactive mode is skipped', async () => {
        vi.mocked(getAccessToken).mockResolvedValue('test-token');
        vi.mocked(needsInteractiveMode).mockReturnValue(false);
        mockFetchResponse(200, { data: [] });

        await expect(executeCreateProject({}))
            .rejects.toThrow('--url or --github is required');
    });

    it('creates a project successfully with --url and --org', async () => {
        vi.mocked(getAccessToken).mockResolvedValue('test-token');

        const fetchMock = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    data: [{ organization: { name: 'My Org', slug: 'my-org' } }],
                }),
                headers: new Headers(),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: () => Promise.resolve({
                    data: {
                        id: 1,
                        name: 'Example Docs',
                        slug: 'example-docs',
                        description: null,
                        organization: { name: 'My Org', slug: 'my-org' },
                        pages_count: 0,
                        last_indexed_at: null,
                        has_indexed_content: false,
                        mcp_url: 'https://yavy.dev/mcp/my-org/example-docs',
                    },
                }),
                headers: new Headers(),
            });
        vi.stubGlobal('fetch', fetchMock);

        await executeCreateProject({
            url: 'https://docs.example.com',
            org: 'my-org',
        });

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Project created successfully!'),
        );
    });

    it('auto-selects org when user has exactly one', async () => {
        vi.mocked(getAccessToken).mockResolvedValue('test-token');

        const fetchMock = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    data: [{ organization: { name: 'Solo Org', slug: 'solo-org' } }],
                }),
                headers: new Headers(),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: () => Promise.resolve({
                    data: {
                        id: 2,
                        name: 'Docs',
                        slug: 'docs',
                        description: null,
                        organization: { name: 'Solo Org', slug: 'solo-org' },
                        pages_count: 0,
                        last_indexed_at: null,
                        has_indexed_content: false,
                        mcp_url: 'https://yavy.dev/mcp/solo-org/docs',
                    },
                }),
                headers: new Headers(),
            });
        vi.stubGlobal('fetch', fetchMock);

        await executeCreateProject({
            github: 'laravel/docs',
        });

        const createCall = fetchMock.mock.calls[1];
        expect(createCall[0]).toContain('/solo-org/projects');
    });

    it('enters interactive mode when no source flags are provided', async () => {
        vi.mocked(getAccessToken).mockResolvedValue('test-token');
        vi.mocked(needsInteractiveMode).mockReturnValue(true);
        vi.mocked(runInteractiveFlow).mockResolvedValue({
            url: 'https://docs.example.com',
            org: 'my-org',
            name: 'Interactive Project',
        });

        const fetchMock = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({
                    data: [{ organization: { name: 'My Org', slug: 'my-org' } }],
                }),
                headers: new Headers(),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: () => Promise.resolve({
                    data: {
                        id: 3,
                        name: 'Interactive Project',
                        slug: 'interactive-project',
                        description: null,
                        organization: { name: 'My Org', slug: 'my-org' },
                        pages_count: 0,
                        last_indexed_at: null,
                        has_indexed_content: false,
                        mcp_url: 'https://yavy.dev/mcp/my-org/interactive-project',
                    },
                }),
                headers: new Headers(),
            });
        vi.stubGlobal('fetch', fetchMock);

        await executeCreateProject({});

        expect(runInteractiveFlow).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Project created successfully!'),
        );
    });
});
