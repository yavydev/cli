import { describe, expect, it } from 'vitest';
import { extractUniqueOrgs, resolveOrg } from '@/commands/project/resolve-org';

describe('extractUniqueOrgs', () => {
    it('returns unique organizations', () => {
        const projects = [
            { organization: { name: 'Acme', slug: 'acme' } },
            { organization: { name: 'Acme', slug: 'acme' } },
            { organization: { name: 'Beta Corp', slug: 'beta-corp' } },
        ];

        const orgs = extractUniqueOrgs(projects);

        expect(orgs).toEqual([
            { name: 'Acme', slug: 'acme' },
            { name: 'Beta Corp', slug: 'beta-corp' },
        ]);
    });

    it('returns empty array for no projects', () => {
        expect(extractUniqueOrgs([])).toEqual([]);
    });

    it('returns single org when all projects belong to one', () => {
        const projects = [
            { organization: { name: 'Solo', slug: 'solo' } },
            { organization: { name: 'Solo', slug: 'solo' } },
        ];

        const orgs = extractUniqueOrgs(projects);

        expect(orgs).toHaveLength(1);
        expect(orgs[0].slug).toBe('solo');
    });
});

describe('resolveOrg', () => {
    it('returns org flag directly when provided', async () => {
        const result = await resolveOrg([], 'my-org');

        expect(result.slug).toBe('my-org');
    });

    it('auto-selects when user has exactly one org', async () => {
        const projects = [
            { organization: { name: 'Solo Org', slug: 'solo-org' } },
        ] as never[];

        const result = await resolveOrg(projects, undefined);

        expect(result.slug).toBe('solo-org');
    });

    it('returns empty slug with orgs list when multiple orgs exist', async () => {
        const projects = [
            { organization: { name: 'Org A', slug: 'org-a' } },
            { organization: { name: 'Org B', slug: 'org-b' } },
        ] as never[];

        const result = await resolveOrg(projects, undefined);

        expect(result.slug).toBe('');
        expect(result.orgs).toHaveLength(2);
    });

    it('throws when no organizations are found', async () => {
        await expect(resolveOrg([], undefined)).rejects.toThrow('No organizations found');
    });
});
