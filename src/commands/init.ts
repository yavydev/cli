import * as p from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import { type ApiProject, YavyApiClient } from '@/api/client';
import { getAccessToken } from '@/auth/store';
import { error } from '@/utils';
import { configureTool } from '@/commands/init/configure-tool';
import { resolveToolFromFlag, scanForTools } from '@/commands/init/scan-tools';
import { AiTool, TOOL_CONFIGS, type InitOptions } from '@/commands/init/types';

export function initCommand(): Command {
    return new Command('init')
        .description('Set up Yavy for your AI tools (skills + MCP config)')
        .option('--tool <name>', 'Configure a specific tool only')
        .option('--yes', 'Non-interactive mode: configure all detected tools + all projects')
        .action(async (options: InitOptions) => {
            try {
                await runInit(options);
            } catch (err) {
                if (typeof err === 'symbol') {
                    p.cancel('Setup cancelled.');
                    process.exit(0);
                }
                error(err instanceof Error ? err.message : String(err));
                process.exit(1);
            }
        });
}

async function runInit(options: InitOptions): Promise<void> {
    p.intro(chalk.bold('Yavy Setup'));

    const client = await ensureAuth();

    const selectedTools = await selectTools(options);
    if (selectedTools.length === 0) {
        p.cancel('No tools selected.');
        process.exit(0);
    }

    const projects = await fetchProjects(client);
    if (projects.length === 0) {
        p.outro(`No indexed projects found. Create one at ${chalk.cyan('https://yavy.dev')}`);
        return;
    }

    const selectedProjects = await selectProjects(projects, options);
    if (selectedProjects.length === 0) {
        p.cancel('No projects selected.');
        process.exit(0);
    }

    const s = p.spinner();
    s.start('Configuring tools...');

    const results = selectedTools.map((tool) => configureTool(tool, selectedProjects, process.cwd()));

    s.stop('Tools configured.');

    p.note(
        results
            .map((r) => {
                const config = TOOL_CONFIGS[r.tool];
                const mcp = r.mcpConfigured ? ` + MCP` : '';
                return `${chalk.bold(config.name)}: ${r.skillPath} (${r.projectFiles.length} project files${mcp})`;
            })
            .join('\n'),
        'Summary',
    );

    p.outro(
        `Set up ${chalk.bold(String(results.length))} tool(s) with ${chalk.bold(String(selectedProjects.length))} project(s). Run ${chalk.cyan('yavy init')} again to refresh.`,
    );
}

async function ensureAuth(): Promise<YavyApiClient> {
    const token = await getAccessToken();

    if (!token) {
        p.log.warn('Not authenticated. Run `yavy login` first.');
        process.exit(1);
    }

    return new YavyApiClient(token);
}

async function selectTools(options: InitOptions): Promise<AiTool[]> {
    if (options.tool) {
        const resolved = resolveToolFromFlag(options.tool);
        if (!resolved) {
            p.log.error(`Unknown tool: ${options.tool}`);
            p.log.info(`Available: ${Object.values(AiTool).join(', ')}`);
            process.exit(1);
        }
        p.log.info(`Configuring ${chalk.bold(TOOL_CONFIGS[resolved].name)}`);
        return [resolved];
    }

    const detected = scanForTools(process.cwd());

    if (options.yes) {
        const tools = detected.length > 0 ? detected : [AiTool.Other];
        p.log.info(`Auto-selecting: ${tools.map((t) => TOOL_CONFIGS[t].name).join(', ')}`);
        return tools;
    }

    const allOptions = [...detected, ...(detected.includes(AiTool.Other) ? [] : [AiTool.Other])].map((tool) => ({
        value: tool,
        label: TOOL_CONFIGS[tool].name,
        hint: detected.includes(tool) && tool !== AiTool.Other ? 'detected' : undefined,
    }));

    if (allOptions.length === 0) {
        allOptions.push({ value: AiTool.Other, label: 'Other', hint: undefined });
    }

    const selected = await p.multiselect({
        message: 'Which AI tools do you want to set up?',
        options: allOptions,
        initialValues: detected,
        required: true,
    });

    if (p.isCancel(selected)) throw selected;

    return selected as AiTool[];
}

async function selectProjects(projects: ApiProject[], options: InitOptions): Promise<ApiProject[]> {
    if (options.yes) {
        p.log.info(`Auto-selecting all ${projects.length} project(s)`);
        return projects;
    }

    const selected = await p.multiselect({
        message: 'Which projects do you want to set up?',
        options: projects.map((proj) => ({
            value: proj.slug,
            label: `${proj.organization.slug}/${proj.name}`,
            hint: `${proj.pages_count} pages`,
        })),
        initialValues: projects.map((proj) => proj.slug),
        required: true,
    });

    if (p.isCancel(selected)) throw selected;

    const selectedSlugs = new Set(selected as string[]);
    return projects.filter((proj) => selectedSlugs.has(proj.slug));
}

async function fetchProjects(client: YavyApiClient): Promise<ApiProject[]> {
    const s = p.spinner();
    s.start('Fetching projects...');

    try {
        const projects = await client.listProjects();
        const indexed = projects.filter((proj) => proj.has_indexed_content);
        s.stop(`Found ${indexed.length} indexed project(s)`);
        return indexed;
    } catch (err) {
        s.stop('Failed to fetch projects');
        throw err;
    }
}
