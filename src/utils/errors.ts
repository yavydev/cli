import { ApiError, type ApiValidationError } from '@/api/client';

export function formatApiError(error: unknown): string {
    if (!(error instanceof ApiError)) {
        if (error instanceof Error) {
            return `Error: ${error.message}`;
        }
        return 'An unexpected error occurred.';
    }

    switch (error.status) {
        case 401:
            return 'Authentication expired. Run `yavy login` to re-authenticate.';

        case 403:
            return 'Permission denied. You do not have access to this organization.';

        case 404:
            return 'Not found. Check that the organization slug is correct.';

        case 422:
            return formatValidationErrors(error.body);

        case 429:
            return 'Rate limit exceeded. Please wait a moment and try again.';

        default:
            return `API error (${error.status}): ${extractMessage(error.body)}`;
    }
}

function formatValidationErrors(body: unknown): string {
    if (!isValidationError(body)) {
        return 'Validation failed. Check your input and try again.';
    }

    const lines = ['Validation failed:'];

    for (const [field, messages] of Object.entries(body.errors)) {
        for (const message of messages) {
            lines.push(`  ${field}: ${message}`);
        }
    }

    return lines.join('\n');
}

function isValidationError(body: unknown): body is ApiValidationError {
    return typeof body === 'object' && body !== null && 'errors' in body && typeof (body as ApiValidationError).errors === 'object';
}

function extractMessage(body: unknown): string {
    if (typeof body === 'object' && body !== null && 'message' in body) {
        return String((body as { message: string }).message);
    }
    return 'Unknown error';
}
