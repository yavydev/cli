import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { YavyApiClient } from '../api/client';
import { YAVY_BASE_URL } from '../config';
import { error } from '../utils';

export function projectsCommand(): Command {
    return new Command('projects')
        .description('List your Yavy projects')
        .option('--json', 'Output as JSON')
        .action(async (options: { json?: boolean }) => {
            const spinner = options.json ? null : ora('Fetching projects...').start();

            try {
                const client = await YavyApiClient.create();
                const projects = await client.listProjects();

                spinner?.stop();

                if (options.json) {
                    console.log(JSON.stringify(projects, null, 2));
                    return;
                }

                if (projects.length === 0) {
                    console.log(`No projects found. Create one at ${YAVY_BASE_URL}`);
                    return;
                }

                console.log(chalk.bold(`\nYour Projects (${projects.length}):\n`));

                for (const project of projects) {
                    const org = chalk.dim(`${project.organization.slug}/`);
                    const name = chalk.bold(project.name);
                    const pages = chalk.cyan(`${project.pages_count} pages`);
                    const indexed = project.last_indexed_at
                        ? chalk.dim(`indexed ${new Date(project.last_indexed_at).toLocaleDateString()}`)
                        : chalk.yellow('not indexed');
                    const content = project.has_indexed_content ? chalk.green(' [indexed]') : '';

                    console.log(`  ${org}${name}  ${pages}  ${indexed}${content}`);
                }

                console.log('');
            } catch (err) {
                spinner?.stop();
                error(err instanceof Error ? err.message : String(err));
                process.exit(1);
            }
        });
}
