import type { CreateProjectOptions, CreateProjectPayload } from '@/commands/project/types';

export function buildCreateProjectPayload(options: CreateProjectOptions): CreateProjectPayload {
    if (options.url) {
        return buildWebCrawlPayload(options);
    }

    if (options.github) {
        return buildGitHubPayload(options);
    }

    throw new Error('Either --url or --github is required.');
}

function buildWebCrawlPayload(options: CreateProjectOptions): CreateProjectPayload {
    return {
        url_discovery_mode: 'web_crawl',
        base_url: options.url,
        ...sharedFields(options),
    };
}

function buildGitHubPayload(options: CreateProjectOptions): CreateProjectPayload {
    return {
        url_discovery_mode: 'github_repository',
        github_repo: options.github,
        ...(options.branch && { github_branch: options.branch }),
        ...(options.docsPath && { github_docs_path: options.docsPath }),
        ...sharedFields(options),
    };
}

function sharedFields(options: CreateProjectOptions): Pick<CreateProjectPayload, 'name' | 'is_public' | 'no_sync'> {
    return {
        ...(options.name && { name: options.name }),
        is_public: !options.private,
        ...(options.noSync && { no_sync: true }),
    };
}
