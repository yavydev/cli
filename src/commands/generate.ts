import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import ora from 'ora';
import chalk from 'chalk';
import { YavyApiClient } from '../api/client.js';
import { getSkillOutputPath, ensureParentDir } from '../utils/paths.js';
import { success, error } from '../utils/output.js';

export function generateCommand(): Command {
  return new Command('generate')
    .description('Generate an AI skill for a project')
    .argument('<org/project>', 'Organization and project slug (e.g., my-org/my-project)')
    .option('--global', 'Save to global skills directory (~/.claude/skills/)')
    .option('--output <path>', 'Custom output path')
    .option('--force', 'Force regeneration even if cached')
    .option('--json', 'Output as JSON')
    .action(async (slug: string, options: { global?: boolean; output?: string; force?: boolean; json?: boolean }) => {
      const parts = slug.split('/');
      if (parts.length !== 2) {
        error('Invalid slug format. Use: org-slug/project-slug');
        process.exit(1);
      }

      const [orgSlug, projectSlug] = parts;
      const spinner = options.json ? null : ora(`Generating skill for ${chalk.bold(slug)}...`).start();

      try {
        const client = YavyApiClient.create();
        const skill = await client.generateSkill(orgSlug, projectSlug, options.force);

        const outputPath = getSkillOutputPath(projectSlug, options);
        ensureParentDir(outputPath);
        writeFileSync(outputPath, skill.content, 'utf-8');

        spinner?.stop();

        if (options.json) {
          console.log(JSON.stringify({
            path: outputPath,
            project: skill.project.name,
            token_count: skill.token_count,
            generated_at: skill.generated_at,
          }, null, 2));
          return;
        }

        success(`Generated skill for ${chalk.bold(skill.project.name)} (${skill.token_count.toLocaleString()} tokens)`);
        console.log(`  → ${chalk.dim(outputPath)}`);
      } catch (err) {
        spinner?.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
