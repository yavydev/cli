import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, relative } from 'node:path';

export function getSkillOutputDir(projectSlug: string, options: { global?: boolean; output?: string }): string {
    if (options.output) {
        return options.output;
    }

    const baseDir = options.global ? join(homedir(), '.claude', 'skills') : join(process.cwd(), '.claude', 'skills');

    return join(baseDir, projectSlug);
}

export function ensureDir(dirPath: string): void {
    mkdirSync(dirPath, { recursive: true });
}

/**
 * Validates that a resolved file path is contained within the expected root directory.
 * Prevents zip-slip / path traversal attacks.
 */
export function isPathSafe(filePath: string, rootDir: string): boolean {
    const resolvedPath = resolve(rootDir, filePath);
    const rel = relative(rootDir, resolvedPath);
    return !rel.startsWith('..') && !resolve(resolvedPath).includes('\0');
}
