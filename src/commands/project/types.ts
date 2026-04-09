export interface CreateProjectOptions {
    url?: string;
    github?: string;
    org?: string;
    name?: string;
    public?: boolean;
    private?: boolean;
    branch?: string;
    docsPath?: string;
    noSync?: boolean;
}

export interface CreateProjectPayload {
    url_discovery_mode: 'web_crawl' | 'github_repository';
    base_url?: string;
    github_repo?: string;
    github_branch?: string;
    github_docs_path?: string;
    name?: string;
    is_public?: boolean;
    no_sync?: boolean;
}
