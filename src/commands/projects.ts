import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { YavyApiClient } from '../api/client.js';
import { error } from '../utils/output.js';

export function projectsCommand(): Command {
  return new Command('projects')
    .description('List your Yavy projects')
    .option('--json', 'Output as JSON')
    .action(async (options: { json?: boolean }) => {
      const spinner = options.json ? null : ora('Fetching projects...').start();

      try {
        const client = YavyApiClient.create();
        const projects = await client.listProjects();

        spinner?.stop();

        if (options.json) {
          console.log(JSON.stringify(projects, null, 2));
          return;
        }

        if (projects.length === 0) {
          console.log('No projects found. Create one at https://yavy.dev');
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
          const skill = project.has_skill ? chalk.green(' [skill]') : '';

          console.log(`  ${org}${name}  ${pages}  ${indexed}${skill}`);
        }

        console.log('');
      } catch (err) {
        spinner?.stop();
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
