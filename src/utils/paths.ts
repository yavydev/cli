import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync, existsSync } from 'node:fs';

export function getSkillOutputPath(projectSlug: string, options: { global?: boolean; output?: string }): string {
  if (options.output) {
    return options.output;
  }

  const baseDir = options.global
    ? join(homedir(), '.claude', 'skills')
    : join(process.cwd(), '.claude', 'skills');

  return join(baseDir, projectSlug, 'SKILL.md');
}

export function ensureParentDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
