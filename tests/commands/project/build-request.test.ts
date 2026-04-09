import { describe, expect, it } from 'vitest';
import { buildCreateProjectPayload } from '@/commands/project/build-request';

describe('buildCreateProjectPayload', () => {
    it('builds a web_crawl payload from --url', () => {
        const payload = buildCreateProjectPayload({
            url: 'https://docs.example.com',
        });

        expect(payload).toEqual({
            url_discovery_mode: 'web_crawl',
            base_url: 'https://docs.example.com',
            is_public: true,
        });
    });

    it('builds a github_repository payload from --github', () => {
        const payload = buildCreateProjectPayload({
            github: 'laravel/docs',
        });

        expect(payload).toEqual({
            url_discovery_mode: 'github_repository',
            github_repo: 'laravel/docs',
            is_public: true,
        });
    });

    it('includes optional github fields', () => {
        const payload = buildCreateProjectPayload({
            github: 'laravel/docs',
            branch: 'main',
            docsPath: 'docs/',
            name: 'Laravel Docs',
        });

        expect(payload).toEqual({
            url_discovery_mode: 'github_repository',
            github_repo: 'laravel/docs',
            github_branch: 'main',
            github_docs_path: 'docs/',
            name: 'Laravel Docs',
            is_public: true,
        });
    });

    it('sets is_public to false when --private is used', () => {
        const payload = buildCreateProjectPayload({
            url: 'https://docs.example.com',
            private: true,
        });

        expect(payload.is_public).toBe(false);
    });

    it('sets is_public to true by default', () => {
        const payload = buildCreateProjectPayload({
            url: 'https://docs.example.com',
        });

        expect(payload.is_public).toBe(true);
    });

    it('includes no_sync when --no-sync is used', () => {
        const payload = buildCreateProjectPayload({
            url: 'https://docs.example.com',
            noSync: true,
        });

        expect(payload.no_sync).toBe(true);
    });

    it('does not include no_sync by default', () => {
        const payload = buildCreateProjectPayload({
            url: 'https://docs.example.com',
        });

        expect(payload.no_sync).toBeUndefined();
    });

    it('includes name when provided', () => {
        const payload = buildCreateProjectPayload({
            url: 'https://docs.example.com',
            name: 'My Docs',
        });

        expect(payload.name).toBe('My Docs');
    });

    it('omits name when not provided', () => {
        const payload = buildCreateProjectPayload({
            url: 'https://docs.example.com',
        });

        expect(payload.name).toBeUndefined();
    });

    it('throws when neither --url nor --github is provided', () => {
        expect(() => buildCreateProjectPayload({})).toThrow(
            'Either --url or --github is required.',
        );
    });
});
