import { getAccessToken } from '../auth/store.js';
import { YAVY_BASE_URL } from '../config.js';

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
    has_skill: boolean;
}

export interface ApiSkill {
    content: string;
    format: string;
    generated_at: string;
    token_count: number;
    project: {
        name: string;
        slug: string;
    };
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

    private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
        const url = `${YAVY_BASE_URL}/api/v1${path}`;
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json',
        };

        if (body) {
            headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (response.status === 401) {
            throw new Error('Authentication expired. Run `yavy login` to re-authenticate.');
        }

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(errorData.error ?? `API request failed with status ${response.status}`);
        }

        return response.json() as Promise<T>;
    }

    async listProjects(): Promise<ApiProject[]> {
        const result = await this.request<{ data: ApiProject[] }>('GET', '/projects');
        return result.data;
    }

    async generateSkill(orgSlug: string, projectSlug: string, force = false): Promise<ApiSkill> {
        return this.request<ApiSkill>('POST', `/${orgSlug}/${projectSlug}/skill/generate`, force ? { force: true } : undefined);
    }

    async getSkill(orgSlug: string, projectSlug: string): Promise<ApiSkill> {
        return this.request<ApiSkill>('GET', `/${orgSlug}/${projectSlug}/skill`);
    }
}
