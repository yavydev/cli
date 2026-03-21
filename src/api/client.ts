import { getAccessToken } from '@/auth/store';
import { MAX_RETRIES, REQUEST_TIMEOUT_MS, YAVY_BASE_URL, YAVY_USER_AGENT } from '@/config';

export interface ProjectContext {
    product: string | null;
    type: string | null;
    domain: string | null;
    version: string | null;
    complexity: string | null;
    target_audience: string[];
    key_topics: string[];
    key_concepts: string[];
    example_queries: string[];
    related_technologies: string[];
    languages: string[];
    content_structure: Array<{ name: string; page_count: number }>;
}

export interface ApiProject {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    organization: {
        name: string;
        slug: string;
    };
    pages_count: number;
    last_indexed_at: string | null;
    has_indexed_content: boolean;
    context: ProjectContext;
}

export interface SearchResult {
    title: string;
    url: string;
    content: string;
    project: string;
}

export interface SearchResponse {
    data: SearchResult[];
    meta: { query: string; total: number };
}

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

function isRetryable(error: unknown, status?: number): boolean {
    if (status && RETRYABLE_STATUS_CODES.has(status)) return true;
    if (error instanceof TypeError) return true; // fetch network errors
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    return false;
}

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class YavyApiClient {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    static async create(): Promise<YavyApiClient> {
        const token = await getAccessToken();
        if (!token) {
            throw new Error('Not authenticated. Run `yavy login` first.');
        }
        return new YavyApiClient(token);
    }

    private baseHeaders(accept = 'application/json'): Record<string, string> {
        return {
            Authorization: `Bearer ${this.token}`,
            Accept: accept,
            'User-Agent': YAVY_USER_AGENT,
        };
    }

    private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
        let lastError: unknown;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                const delay = Math.min(1000 * 2 ** (attempt - 1), 10_000);
                const jitter = Math.random() * delay * 0.1;
                await sleep(delay + jitter);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            try {
                const response = await fetch(url, { ...init, signal: controller.signal });

                if (response.ok || response.status === 401 || !isRetryable(null, response.status)) {
                    return response;
                }

                lastError = new Error(`HTTP ${response.status}`);
            } catch (err) {
                if (!isRetryable(err)) throw err;
                lastError = err;
            } finally {
                clearTimeout(timeoutId);
            }
        }

        throw lastError;
    }

    private async handleErrorResponse(response: Response): Promise<never> {
        if (response.status === 401) {
            throw new Error('Authentication expired. Run `yavy login` to re-authenticate.');
        }

        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error ?? `API request failed with status ${response.status}`);
    }

    private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
        const url = `${YAVY_BASE_URL}/api/v1${path}`;
        const headers: Record<string, string> = { ...this.baseHeaders() };

        if (body) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await this.fetchWithRetry(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            await this.handleErrorResponse(response);
        }

        return response.json() as Promise<T>;
    }

    async listProjects(): Promise<ApiProject[]> {
        const result = await this.request<{ data: ApiProject[] }>('GET', '/projects');
        return result.data;
    }

    async search(query: string, options?: { project?: string; limit?: number }): Promise<SearchResponse> {
        const params = new URLSearchParams({ query });
        if (options?.project) params.set('project', options.project);
        if (options?.limit) params.set('limit', String(options.limit));
        return this.request<SearchResponse>('GET', `/search?${params}`);
    }

    async downloadSkill(orgSlug: string, projectSlug: string): Promise<ArrayBuffer> {
        const url = `${YAVY_BASE_URL}/api/v1/${orgSlug}/${projectSlug}/skill/download`;

        const response = await this.fetchWithRetry(url, {
            method: 'GET',
            headers: this.baseHeaders('application/zip'),
        });

        if (!response.ok) {
            await this.handleErrorResponse(response);
        }

        return response.arrayBuffer();
    }
}
