import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export function getSkillOutputDir(projectSlug: string, options: { global?: boolean; output?: string }): string {
    if (options.output) {
        return options.output;
    }

    const baseDir = options.global ? join(homedir(), '.claude', 'skills') : join(process.cwd(), '.claude', 'skills');

    return join(baseDir, projectSlug);
}

export function ensureDir(dirPath: string): void {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
}

export function ensureParentDir(filePath: string): void {
    const dir = dirname(filePath);
    ensureDir(dir);
}
