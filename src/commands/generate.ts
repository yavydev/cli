import chalk from 'chalk';
import { Command } from 'commander';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import ora from 'ora';
import { YavyApiClient } from '../api/client.js';
import { error, success } from '../utils/output.js';
import { ensureDir, getSkillOutputDir } from '../utils/paths.js';

export function generateCommand(): Command {
    return new Command('generate')
        .description('Download an AI skill for a project')
        .argument('<org/project>', 'Organization and project slug (e.g., my-org/my-project)')
        .option('--global', 'Save to global skills directory (~/.claude/skills/)')
        .option('--output <path>', 'Custom output directory')
        .option('--json', 'Output as JSON')
        .action(async (slug: string, options: { global?: boolean; output?: string; json?: boolean }) => {
            const parts = slug.split('/');
            if (parts.length !== 2) {
                error('Invalid slug format. Use: org-slug/project-slug');
                process.exit(1);
            }

            const [orgSlug, projectSlug] = parts;
            const spinner = options.json ? null : ora(`Downloading skill for ${chalk.bold(slug)}...`).start();

            try {
                const client = await YavyApiClient.create();
                const zipBuffer = await client.downloadSkill(orgSlug, projectSlug);

                const outputDir = getSkillOutputDir(projectSlug, options);
                extractZip(Buffer.from(zipBuffer), outputDir, projectSlug);

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
 * Extract a zip buffer to the output directory.
 * Strips the top-level project-slug prefix from zip entries.
 */
function extractZip(zipBuffer: Buffer, outputDir: string, projectSlug: string): void {
    const tmpZip = join(tmpdir(), `yavy-skill-${Date.now()}.zip`);
    const tmpExtract = join(tmpdir(), `yavy-extract-${Date.now()}`);

    try {
        writeFileSync(tmpZip, zipBuffer);
        ensureDir(tmpExtract);

        // execFileSync is safe from shell injection (no shell invoked)
        execFileSync('unzip', ['-o', tmpZip, '-d', tmpExtract], { stdio: 'pipe' });

        const prefixDir = join(tmpExtract, projectSlug);
        const sourceDir = existsSync(prefixDir) ? prefixDir : tmpExtract;

        ensureDir(outputDir);
        copyDirRecursive(sourceDir, outputDir);
    } finally {
        rmSync(tmpZip, { force: true });
        rmSync(tmpExtract, { recursive: true, force: true });
    }
}

function copyDirRecursive(src: string, dest: string): void {
    ensureDir(dest);

    for (const entry of readdirSync(src, { withFileTypes: true })) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            writeFileSync(destPath, readFileSync(srcPath));
        }
    }
}
