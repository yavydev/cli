import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockResponse } from '../__test__/helpers.js';
import { YavyApiClient } from './client.js';

vi.mock('../auth/store.js', () => ({
    getAccessToken: vi.fn(),
}));

vi.mock('../config.js', () => ({
    YAVY_BASE_URL: 'https://test.yavy.dev',
    YAVY_CLIENT_ID: 'test-client-id',
}));

import { getAccessToken } from '../auth/store.js';

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

    it('sends GET to /api/v1/projects with Bearer auth', async () => {
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

    it('sends GET to correct download path', async () => {
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
            status: 502,
            json: () => Promise.reject(new Error('not json')),
            headers: new Headers(),
        } as Response);
        await expect(client.listProjects()).rejects.toThrow('API request failed with status 502');
    });
});
