import chalk from 'chalk';
import { Command } from 'commander';
import { unzipSync } from 'fflate';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import ora from 'ora';
import { YavyApiClient } from '../api/client';
import { ensureDir, error, getSkillOutputDir, isPathSafe, success, warn } from '../utils';

export function generateCommand(): Command {
    return new Command('generate')
        .description('Download an AI skill for a project')
        .argument('<org/project>', 'Organization and project slug (e.g., my-org/my-project)')
        .option('--global', 'Save to global skills directory (~/.claude/skills/)')
        .option('--output <path>', 'Custom output directory')
        .option('--force', 'Overwrite existing skill files')
        .option('--json', 'Output as JSON')
        .action(async (slug: string, options: { global?: boolean; output?: string; force?: boolean; json?: boolean }) => {
            const parts = slug.split('/');
            if (parts.length !== 2) {
                error('Invalid slug format. Use: org-slug/project-slug');
                process.exit(1);
            }

            const [orgSlug, projectSlug] = parts;
            const outputDir = getSkillOutputDir(projectSlug, options);

            if (!options.force && existsSync(join(outputDir, 'SKILL.md'))) {
                warn(`Skill files already exist at ${outputDir}. Use --force to overwrite.`);
                process.exit(1);
            }

            const spinner = options.json ? null : ora(`Downloading skill for ${chalk.bold(slug)}...`).start();

            try {
                const client = await YavyApiClient.create();
                const zipBuffer = await client.downloadSkill(orgSlug, projectSlug);

                extractZip(new Uint8Array(zipBuffer), outputDir, projectSlug);

                spinner?.stop();

                const skillPath = join(outputDir, 'SKILL.md');
                const refsDir = join(outputDir, 'references');
                const refCount = existsSync(refsDir) ? readdirSync(refsDir).length : 0;

                if (options.json) {
                    console.log(
                        JSON.stringify(
                            {
                                path: outputDir,
                                skill_file: skillPath,
                                reference_count: refCount,
                            },
                            null,
                            2,
                        ),
                    );
                    return;
                }

                success(`Downloaded skill for ${chalk.bold(slug)} (${refCount} reference files)`);
                console.log(`  ${chalk.dim(skillPath)}`);
            } catch (err) {
                spinner?.stop();
                error(err instanceof Error ? err.message : String(err));
                process.exit(1);
            }
        });
}

/**
 * Extract a zip buffer to the output directory using fflate (pure JS, cross-platform).
 * Strips the top-level project-slug prefix from zip entries.
 * Validates all paths to prevent zip-slip attacks.
 */
function extractZip(zipData: Uint8Array, outputDir: string, projectSlug: string): void {
    const files = unzipSync(zipData);
    const prefix = `${projectSlug}/`;

    ensureDir(outputDir);

    for (const [rawPath, data] of Object.entries(files)) {
        if (rawPath.endsWith('/')) continue;

        const relativePath = rawPath.startsWith(prefix) ? rawPath.slice(prefix.length) : rawPath;
        const normalizedPath = normalize(relativePath);

        if (!isPathSafe(normalizedPath, outputDir)) {
            throw new Error(`Zip contains unsafe path: ${rawPath}`);
        }

        const destPath = join(outputDir, normalizedPath);
        ensureDir(dirname(destPath));
        writeFileSync(destPath, data);
    }
}
