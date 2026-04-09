import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/client';
import { formatApiError } from '@/utils/errors';

describe('formatApiError', () => {
    it('maps 401 to auth error', () => {
        const error = new ApiError(401, { message: 'Unauthenticated.' });
        const message = formatApiError(error);

        expect(message).toContain('Authentication expired');
    });

    it('maps 403 to permission denied', () => {
        const error = new ApiError(403, { message: 'Forbidden.' });
        const message = formatApiError(error);

        expect(message).toContain('Permission denied');
    });

    it('maps 404 to not found', () => {
        const error = new ApiError(404, { message: 'Not Found.' });
        const message = formatApiError(error);

        expect(message).toContain('Not found');
    });

    it('maps 422 to formatted validation errors', () => {
        const error = new ApiError(422, {
            message: 'The given data was invalid.',
            errors: {
                base_url: ['The base url field is required.'],
                url_discovery_mode: ['Only web_crawl and github_repository are supported.'],
            },
        });
        const message = formatApiError(error);

        expect(message).toContain('Validation failed:');
        expect(message).toContain('base_url: The base url field is required.');
        expect(message).toContain('url_discovery_mode: Only web_crawl and github_repository are supported.');
    });

    it('maps 429 to rate limit message', () => {
        const error = new ApiError(429, { message: 'Too Many Attempts.' });
        const message = formatApiError(error);

        expect(message).toContain('Rate limit');
    });

    it('handles unknown status codes', () => {
        const error = new ApiError(500, { message: 'Server Error' });
        const message = formatApiError(error);

        expect(message).toContain('500');
        expect(message).toContain('Server Error');
    });

    it('handles non-ApiError errors', () => {
        const error = new Error('Network failure');
        const message = formatApiError(error);

        expect(message).toContain('Network failure');
    });

    it('handles unknown error types', () => {
        const message = formatApiError('something weird');

        expect(message).toContain('unexpected error');
    });

    it('handles 422 with no structured errors', () => {
        const error = new ApiError(422, { message: 'Bad request' });
        const message = formatApiError(error);

        expect(message).toContain('Validation failed');
    });
});
