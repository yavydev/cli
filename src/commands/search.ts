import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { YavyApiClient } from '../api/client';
import { error } from '../utils';

export function searchCommand(): Command {
    return new Command('search')
        .description('Search your indexed documentation')
        .argument('<query>', 'Natural language search query')
        .option('--project <org/project>', 'Scope search to a specific project')
        .option('--limit <number>', 'Maximum results (1-20, default 10)', '10')
        .option('--json', 'Output as JSON')
        .action(async (query: string, options: { project?: string; limit: string; json?: boolean }) => {
            const limit = parseInt(options.limit, 10);
            const spinner = options.json ? null : ora('Searching...').start();

            try {
                const client = await YavyApiClient.create();
                const response = await client.search(query, {
                    project: options.project,
                    limit: isNaN(limit) ? undefined : limit,
                });

                spinner?.stop();

                if (options.json) {
                    console.log(JSON.stringify(response, null, 2));
                    return;
                }

                if (response.data.length === 0) {
                    console.log(`No results found for "${query}"`);
                    return;
                }

                console.log(`\nFound ${response.meta.total} result(s) for ${chalk.bold(`"${query}"`)}\n`);

                for (const [index, result] of response.data.entries()) {
                    const num = chalk.dim(`${index + 1}.`);
                    const title = chalk.bold(result.title);
                    const project = chalk.dim(result.project);
                    const url = chalk.cyan(result.url);

                    console.log(`  ${num} ${title}`);
                    console.log(`     ${project} · ${url}`);

                    const snippet = result.content.length > 200 ? result.content.slice(0, 200) + '...' : result.content;
                    console.log(`     ${chalk.dim(snippet)}\n`);
                }
            } catch (err) {
                spinner?.stop();
                error(err instanceof Error ? err.message : String(err));
                process.exit(1);
            }
        });
}
