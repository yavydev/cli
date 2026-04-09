import chalk from 'chalk';
import type { ApiProject } from '@/api/client';

export function success(message: string): void {
    console.log(chalk.green('✓') + ' ' + message);
}

export function error(message: string): void {
    console.error(chalk.red('✗') + ' ' + message);
}

export function warn(message: string): void {
    console.error(chalk.yellow('⚠') + ' ' + message);
}

export function info(message: string): void {
    console.log(chalk.blue('ℹ') + ' ' + message);
}

export function formatProjectCreated(project: ApiProject): string {
    return [
        '',
        `  Project created successfully!`,
        '',
        `  Name:     ${project.name}`,
        `  Org:      ${project.organization.name} (${project.organization.slug})`,
        `  Slug:     ${project.slug}`,
        `  MCP URL:  ${project.mcp_url}`,
        '',
    ].join('\n');
}
