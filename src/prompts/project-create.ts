import * as p from '@clack/prompts';
import type { YavyApiClient } from '@/api/client';
import type { OrganizationInfo } from '@/api/client';
import { extractUniqueOrgs, resolveOrg } from '@/commands/project/resolve-org';
import type { CreateProjectOptions } from '@/commands/project/types';

type SourceType = 'web_crawl' | 'github_repository';

export function needsInteractiveMode(options: CreateProjectOptions): boolean {
    return !options.url && !options.github;
}

export async function runInteractiveFlow(client: YavyApiClient, options: CreateProjectOptions): Promise<CreateProjectOptions> {
    const source = await collectSourceFromPrompts();
    const orgSlug = await resolveOrgInteractively(client, options.org);

    return {
        ...options,
        ...source,
        org: orgSlug,
    };
}

export async function collectSourceFromPrompts(): Promise<Pick<CreateProjectOptions, 'url' | 'github'>> {
    const sourceType = await promptSourceType();

    if (sourceType === 'web_crawl') {
        const url = await promptUrl();
        return { url };
    }

    const github = await promptGitHub();
    return { github };
}

export async function resolveOrgInteractively(client: YavyApiClient, orgFlag: string | undefined): Promise<string> {
    if (orgFlag) {
        return orgFlag;
    }

    const projects = await client.listProjects();
    const { slug, orgs } = await resolveOrg(projects, undefined);

    if (slug) {
        return slug;
    }

    return promptOrgSelection(orgs);
}

export async function fetchUserOrgs(client: YavyApiClient): Promise<OrganizationInfo[]> {
    const projects = await client.listProjects();
    return extractUniqueOrgs(projects);
}

async function promptSourceType(): Promise<SourceType> {
    const result = await p.select({
        message: 'What type of documentation source?',
        options: [
            { label: 'Web Crawl (URL)', value: 'web_crawl' as const },
            { label: 'GitHub Repository', value: 'github_repository' as const },
        ],
    });

    if (p.isCancel(result)) {
        throw new Error('cancelled');
    }

    return result;
}

async function promptUrl(): Promise<string> {
    const result = await p.text({
        message: 'Documentation URL:',
        validate: (value: string) => {
            if (!value.trim()) {
                return 'URL is required.';
            }

            try {
                const parsed = new URL(value);
                if (!['http:', 'https:'].includes(parsed.protocol)) {
                    return 'URL must use http or https.';
                }
            } catch {
                return 'Please enter a valid URL (e.g. https://docs.example.com).';
            }
        },
    });

    if (p.isCancel(result)) {
        throw new Error('cancelled');
    }

    return result;
}

async function promptGitHub(): Promise<string> {
    const result = await p.text({
        message: 'GitHub repository (owner/repo):',
        validate: (value: string) => {
            if (!value.trim()) {
                return 'Repository is required.';
            }

            if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(value)) {
                return 'Please enter a valid owner/repo format (e.g. laravel/docs).';
            }
        },
    });

    if (p.isCancel(result)) {
        throw new Error('cancelled');
    }

    return result;
}

async function promptOrgSelection(orgs: OrganizationInfo[]): Promise<string> {
    const result = await p.select({
        message: 'Which organization?',
        options: orgs.map((org) => ({
            label: `${org.name} (${org.slug})`,
            value: org.slug,
        })),
    });

    if (p.isCancel(result)) {
        throw new Error('cancelled');
    }

    return result;
}
