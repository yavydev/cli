import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrganizationInfo } from '@/api/client';
import type { CreateProjectOptions } from '@/commands/project/types';

vi.mock('@clack/prompts', () => ({
    select: vi.fn(),
    text: vi.fn(),
    isCancel: vi.fn(() => false),
}));

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

vi.mock('@/commands/project/resolve-org', () => ({
    extractUniqueOrgs: vi.fn(),
    resolveOrg: vi.fn(),
}));

import * as p from '@clack/prompts';
import { resolveOrg } from '@/commands/project/resolve-org';
import {
    collectSourceFromPrompts,
    needsInteractiveMode,
    resolveOrgInteractively,
    runInteractiveFlow,
} from '@/prompts/project-create';

describe('needsInteractiveMode', () => {
    it('returns true when no source flag is provided', () => {
        expect(needsInteractiveMode({})).toBe(true);
    });

    it('returns true when only --org is provided', () => {
        expect(needsInteractiveMode({ org: 'my-org' })).toBe(true);
    });

    it('returns false when --url is provided', () => {
        expect(needsInteractiveMode({ url: 'https://docs.example.com' })).toBe(false);
    });

    it('returns false when --github is provided', () => {
        expect(needsInteractiveMode({ github: 'laravel/docs' })).toBe(false);
    });
});

describe('collectSourceFromPrompts', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('prompts for URL when user selects WebCrawl', async () => {
        vi.mocked(p.select).mockResolvedValueOnce('web_crawl');
        vi.mocked(p.text).mockResolvedValueOnce('https://docs.example.com');

        const result = await collectSourceFromPrompts();

        expect(result).toEqual({ url: 'https://docs.example.com' });
        expect(p.select).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'What type of documentation source?' }),
        );
    });

    it('prompts for owner/repo when user selects GitHub', async () => {
        vi.mocked(p.select).mockResolvedValueOnce('github_repository');
        vi.mocked(p.text).mockResolvedValueOnce('laravel/docs');

        const result = await collectSourceFromPrompts();

        expect(result).toEqual({ github: 'laravel/docs' });
    });
});

describe('resolveOrgInteractively', () => {
    let mockClient: { listProjects: ReturnType<typeof vi.fn>; createProject: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockClient = {
            listProjects: vi.fn().mockResolvedValue([]),
            createProject: vi.fn(),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns the org flag directly when provided', async () => {
        const result = await resolveOrgInteractively(mockClient as never, 'my-org');

        expect(result).toBe('my-org');
        expect(mockClient.listProjects).not.toHaveBeenCalled();
    });

    it('auto-selects when user has exactly one org', async () => {
        mockClient.listProjects.mockResolvedValue([
            { organization: { name: 'Solo Org', slug: 'solo-org' } },
        ]);
        vi.mocked(resolveOrg).mockResolvedValue({
            slug: 'solo-org',
            orgs: [{ name: 'Solo Org', slug: 'solo-org' }],
        });

        const result = await resolveOrgInteractively(mockClient as never, undefined);

        expect(result).toBe('solo-org');
    });

    it('prompts for selection when user has multiple orgs', async () => {
        const orgs: OrganizationInfo[] = [
            { name: 'Org A', slug: 'org-a' },
            { name: 'Org B', slug: 'org-b' },
        ];
        mockClient.listProjects.mockResolvedValue([
            { organization: orgs[0] },
            { organization: orgs[1] },
        ]);
        vi.mocked(resolveOrg).mockResolvedValue({ slug: '', orgs });
        vi.mocked(p.select).mockResolvedValueOnce('org-b');

        const result = await resolveOrgInteractively(mockClient as never, undefined);

        expect(result).toBe('org-b');
        expect(p.select).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Which organization?',
            }),
        );
    });
});

describe('runInteractiveFlow', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('merges prompt results with existing options', async () => {
        const mockClient = {
            listProjects: vi.fn().mockResolvedValue([
                { organization: { name: 'My Org', slug: 'my-org' } },
            ]),
            createProject: vi.fn(),
        };
        vi.mocked(resolveOrg).mockResolvedValue({
            slug: 'my-org',
            orgs: [{ name: 'My Org', slug: 'my-org' }],
        });
        vi.mocked(p.select).mockResolvedValueOnce('web_crawl');
        vi.mocked(p.text).mockResolvedValueOnce('https://docs.example.com');

        const existingOptions: CreateProjectOptions = { name: 'My Project', private: true };
        const result = await runInteractiveFlow(mockClient as never, existingOptions);

        expect(result).toEqual({
            name: 'My Project',
            private: true,
            url: 'https://docs.example.com',
            org: 'my-org',
        });
    });
});
