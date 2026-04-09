import { Command } from 'commander';
import { YavyApiClient } from '@/api/client';
import { needsInteractiveMode, runInteractiveFlow } from '@/prompts/project-create';
import { error, formatProjectCreated } from '@/utils';
import { buildCreateProjectPayload } from '@/commands/project/build-request';
import { resolveOrg } from '@/commands/project/resolve-org';
import type { CreateProjectOptions } from '@/commands/project/types';

export function createProjectCommand(): Command {
    return new Command('create')
        .description('Create a new documentation project')
        .option('--url <url>', 'Documentation URL (WebCrawl source)')
        .option('--github <owner/repo>', 'GitHub repository (e.g. laravel/docs)')
        .option('--org <slug>', 'Organization slug')
        .option('--name <name>', 'Project name (auto-generated if omitted)')
        .option('--public', 'Make project public (default)')
        .option('--private', 'Make project private')
        .option('--branch <branch>', 'GitHub branch override')
        .option('--docs-path <path>', 'GitHub docs path')
        .option('--no-sync', 'Skip initial auto-sync')
        .action(async (options: CreateProjectOptions) => {
            try {
                await executeCreateProject(options);
            } catch (err) {
                if (err instanceof Error && err.message === 'cancelled') {
                    console.log('\nProject creation cancelled.');
                    return;
                }
                error(err instanceof Error ? err.message : String(err));
                process.exit(1);
            }
        });
}

export async function executeCreateProject(options: CreateProjectOptions): Promise<void> {
    const client = await YavyApiClient.create();

    let resolvedOptions = options;

    if (needsInteractiveMode(options)) {
        resolvedOptions = await runInteractiveFlow(client, options);
    }

    if (!resolvedOptions.url && !resolvedOptions.github) {
        throw new Error('Either --url or --github is required.');
    }

    if (resolvedOptions.url && resolvedOptions.github) {
        throw new Error('Provide either --url or --github, not both.');
    }

    const projects = await client.listProjects();
    const { slug: orgSlug, orgs } = await resolveOrg(projects, resolvedOptions.org);

    if (!orgSlug) {
        const slugList = orgs.map((o) => `  - ${o.slug} (${o.name})`).join('\n');
        throw new Error(`Multiple organizations found. Please specify one with --org <slug>:\n${slugList}`);
    }

    const payload = buildCreateProjectPayload(resolvedOptions);
    const response = await client.createProject(orgSlug, payload);

    console.log(formatProjectCreated(response.data));
}
