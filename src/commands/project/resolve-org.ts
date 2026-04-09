import type { ApiProject, OrganizationInfo } from '@/api/client';

export function extractUniqueOrgs(projects: Array<{ organization: OrganizationInfo }>): OrganizationInfo[] {
    const seen = new Set<string>();
    const orgs: OrganizationInfo[] = [];

    for (const project of projects) {
        if (!seen.has(project.organization.slug)) {
            seen.add(project.organization.slug);
            orgs.push(project.organization);
        }
    }

    return orgs;
}

export async function resolveOrg(projects: ApiProject[], orgFlag: string | undefined): Promise<{ slug: string; orgs: OrganizationInfo[] }> {
    if (orgFlag) {
        return { slug: orgFlag, orgs: [] };
    }

    const orgs = extractUniqueOrgs(projects);

    if (orgs.length === 0) {
        throw new Error('No organizations found. Please specify an organization with --org <slug>.');
    }

    if (orgs.length === 1 && orgs[0]) {
        return { slug: orgs[0].slug, orgs };
    }

    return { slug: '', orgs };
}
