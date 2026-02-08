import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockResponse } from '../__test__/helpers';
import { YavyApiClient } from './client';

vi.mock('../auth/store', () => ({
    getAccessToken: vi.fn(),
}));

vi.mock('../config', () => ({
    YAVY_BASE_URL: 'https://test.yavy.dev',
    YAVY_CLIENT_ID: 'test-client-id',
    YAVY_USER_AGENT: '@yavydev/cli',
    REQUEST_TIMEOUT_MS: 30_000,
    MAX_RETRIES: 3,
}));

import { getAccessToken } from '../auth/store';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('YavyApiClient.create', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('returns client instance when token exists', async () => {
        vi.mocked(getAccessToken).mockResolvedValue('my-token');
        const client = await YavyApiClient.create();
        expect(client).toBeInstanceOf(YavyApiClient);
    });

    it('throws "Not authenticated" when token is null', async () => {
        vi.mocked(getAccessToken).mockResolvedValue(null);
        await expect(YavyApiClient.create()).rejects.toThrow('Not authenticated');
    });
});

describe('listProjects', () => {
    let client: YavyApiClient;

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
        vi.mocked(getAccessToken).mockResolvedValue('test-token');
    });

    it('sends GET to /api/v1/projects with Bearer auth and User-Agent', async () => {
        const projects = [{ id: 1, name: 'Test Project' }];
        vi.mocked(fetch).mockResolvedValue(createMockResponse({ data: projects }));

        client = await YavyApiClient.create();
        const result = await client.listProjects();

        expect(fetch).toHaveBeenLastCalledWith(
            'https://test.yavy.dev/api/v1/projects',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-token',
                    'User-Agent': '@yavydev/cli',
                }),
            }),
        );
        expect(result).toEqual(projects);
    });
});

describe('downloadSkill', () => {
    let client: YavyApiClient;

    beforeEach(async () => {
        vi.stubGlobal('fetch', vi.fn());
        vi.mocked(getAccessToken).mockResolvedValue('test-token');
        client = await YavyApiClient.create();
    });

    it('sends GET to correct download path with Accept: application/zip', async () => {
        const mockBuffer = new ArrayBuffer(10);
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            arrayBuffer: () => Promise.resolve(mockBuffer),
            headers: new Headers(),
        } as Response);

        await client.downloadSkill('my-org', 'my-project');

        expect(fetch).toHaveBeenLastCalledWith(
            'https://test.yavy.dev/api/v1/my-org/my-project/skill/download',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-token',
                    Accept: 'application/zip',
                    'User-Agent': '@yavydev/cli',
                }),
            }),
        );
    });

    it('returns ArrayBuffer from response', async () => {
        const mockBuffer = new ArrayBuffer(10);
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            arrayBuffer: () => Promise.resolve(mockBuffer),
            headers: new Headers(),
        } as Response);

        const result = await client.downloadSkill('org', 'proj');
        expect(result).toBe(mockBuffer);
    });

    it('throws on 401 response', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 401,
            json: () => Promise.resolve({}),
            headers: new Headers(),
        } as Response);

        await expect(client.downloadSkill('org', 'proj')).rejects.toThrow('Authentication expired');
    });

    it('throws error message from JSON body on non-ok response', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 422,
            json: () => Promise.resolve({ error: 'Project has no indexed content' }),
            headers: new Headers(),
        } as Response);

        await expect(client.downloadSkill('org', 'proj')).rejects.toThrow('Project has no indexed content');
    });
});

describe('error handling', () => {
    let client: YavyApiClient;

    beforeEach(async () => {
        vi.stubGlobal('fetch', vi.fn());
        vi.mocked(getAccessToken).mockResolvedValue('test-token');
        client = await YavyApiClient.create();
    });

    it('throws "Authentication expired" on 401', async () => {
        vi.mocked(fetch).mockResolvedValue(createMockResponse({}, 401));
        await expect(client.listProjects()).rejects.toThrow('Authentication expired');
    });

    it('throws error message from JSON body on non-ok response', async () => {
        vi.mocked(fetch).mockResolvedValue(createMockResponse({ error: 'Project not found' }, 404));
        await expect(client.listProjects()).rejects.toThrow('Project not found');
    });

    it('throws generic status message when error body has no error field', async () => {
        vi.mocked(fetch).mockResolvedValue(createMockResponse({}, 500));
        await expect(client.listProjects()).rejects.toThrow('API request failed with status 500');
    });

    it('throws generic message when error body is not JSON', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.reject(new Error('not json')),
            headers: new Headers(),
        } as Response);
        await expect(client.listProjects()).rejects.toThrow('API request failed with status 400');
    });
});

describe('retry behavior', () => {
    let client: YavyApiClient;

    beforeEach(async () => {
        vi.stubGlobal('fetch', vi.fn());
        vi.mocked(getAccessToken).mockResolvedValue('test-token');
        client = await YavyApiClient.create();
    });

    it('retries on 503 and succeeds on second attempt', async () => {
        vi.mocked(fetch)
            .mockResolvedValueOnce(createMockResponse({}, 503))
            .mockResolvedValueOnce(createMockResponse({ data: [] }));

        const result = await client.listProjects();
        expect(result).toEqual([]);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('retries on network TypeError', async () => {
        vi.mocked(fetch)
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockResolvedValueOnce(createMockResponse({ data: [{ id: 1 }] }));

        const result = await client.listProjects();
        expect(result).toEqual([{ id: 1 }]);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry on 401', async () => {
        vi.mocked(fetch).mockResolvedValue(createMockResponse({}, 401));

        await expect(client.listProjects()).rejects.toThrow('Authentication expired');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('does not retry on 404', async () => {
        vi.mocked(fetch).mockResolvedValue(createMockResponse({ error: 'Not found' }, 404));

        await expect(client.listProjects()).rejects.toThrow('Not found');
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
