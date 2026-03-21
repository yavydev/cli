import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ApiProject } from '@/api/client';
import { YAVY_BASE_URL } from '@/config';
import { generateProjectContent, generateSkillContent, slugify } from '@/commands/init/generate-skill';
import { type AiTool, TOOL_CONFIGS } from '@/commands/init/types';
import { warn } from '@/utils';

export interface ConfigureResult {
    tool: AiTool;
    skillPath: string;
    mcpConfigured: boolean;
    projectFiles: string[];
}

export function configureTool(tool: AiTool, projects: ApiProject[], cwd: string): ConfigureResult {
    const config = TOOL_CONFIGS[tool];
    const skillDir = join(cwd, config.skillDir);
    const projectsDir = join(skillDir, 'projects');

    mkdirSync(projectsDir, { recursive: true });

    const skillContent = generateSkillContent(projects);
    const skillPath = join(skillDir, 'SKILL.md');
    writeFileSync(skillPath, skillContent, 'utf-8');

    const projectFiles: string[] = [];
    for (const project of projects) {
        const fileName = `${slugify(project.slug)}.md`;
        const filePath = join(projectsDir, fileName);
        writeFileSync(filePath, generateProjectContent(project), 'utf-8');
        projectFiles.push(filePath);
    }

    let mcpConfigured = false;
    if (config.mcpConfigPath) {
        const mcpPath = join(cwd, config.mcpConfigPath);
        if (config.mcpFormat === 'json') {
            mergeJsonMcpConfig(mcpPath, projects);
            mcpConfigured = true;
        } else if (config.mcpFormat === 'embedded') {
            mergeEmbeddedMcpConfig(mcpPath, projects, config.mcpServerKey ?? 'mcp');
            mcpConfigured = true;
        }
    }

    return { tool, skillPath, mcpConfigured, projectFiles };
}

function buildMcpUrl(projects: ApiProject[]): string {
    const orgSlugs = [...new Set(projects.map((proj) => proj.organization.slug))];

    if (orgSlugs.length > 1) {
        warn(
            `Projects span multiple organizations (${orgSlugs.join(', ')}). ` +
                `MCP will be configured for "${orgSlugs[0]}" only. Run yavy init per organization for full coverage.`,
        );
    }

    return `${YAVY_BASE_URL}/mcp/${encodeURIComponent(orgSlugs[0])}`;
}

function readJsonFile(configPath: string): Record<string, unknown> {
    if (!existsSync(configPath)) return {};
    const content = readFileSync(configPath, 'utf-8');
    try {
        return JSON.parse(content) as Record<string, unknown>;
    } catch (err) {
        throw new Error(
            `Failed to parse ${configPath}: ${err instanceof Error ? err.message : String(err)}. ` +
                `Fix the JSON manually or delete the file and re-run yavy init.`,
            { cause: err },
        );
    }
}

function writeJsonFile(configPath: string, data: Record<string, unknown>): void {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/** Standard MCP config: { servers: { yavy: { url, type } } } (Cursor, VS Code) */
function mergeJsonMcpConfig(configPath: string, projects: ApiProject[]): void {
    const existing = readJsonFile(configPath);
    const serverKey = existing.mcpServers ? 'mcpServers' : 'servers';
    const servers = (existing[serverKey] ?? {}) as Record<string, unknown>;

    servers['yavy'] = { url: buildMcpUrl(projects), type: 'sse' };
    existing[serverKey] = servers;
    writeJsonFile(configPath, existing);
}

/** Embedded MCP config: { mcp: { yavy: { url, type } } } (OpenCode) */
function mergeEmbeddedMcpConfig(configPath: string, projects: ApiProject[], mcpKey: string): void {
    const existing = readJsonFile(configPath);
    const mcpSection = (existing[mcpKey] ?? {}) as Record<string, unknown>;

    mcpSection['yavy'] = { url: buildMcpUrl(projects), type: 'remote' };

    existing[mcpKey] = mcpSection;
    writeJsonFile(configPath, existing);
}
