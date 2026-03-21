import type { ApiProject } from '@/api/client';

export function generateSkillContent(projects: ApiProject[]): string {
    const projectNames = projects.map((p) => p.name).join(', ');
    const description = `Search indexed documentation for ${projectNames}. Use when user needs reference info, asks 'how does X work', or needs API/feature lookups from these projects.`;

    const projectRows = projects
        .map((p) => `| ${escapePipe(p.name)} | \`${p.organization.slug}/${p.slug}\` | ${p.pages_count} | \`projects/${slugify(p.slug)}.md\` |`)
        .join('\n');

    return `---
name: yavy
description: "${truncate(escapeYaml(description), 500)}"
allowed-tools: ['Bash']
---

# Yavy Documentation Search

Search indexed documentation via the Yavy CLI.

## Commands

| Command | Purpose |
|---------|---------|
| \`yavy search "query"\` | Search all projects |
| \`yavy search "query" --project slug\` | Search one project |
| \`yavy search "query" --json\` | JSON output for parsing |

## Indexed Projects

| Project | Slug | Pages | Docs |
|---------|------|-------|------|
${projectRows}

## When to Use --project

- User mentions a specific technology from the table above
- Query clearly scopes to one domain
- Omit when topic could span multiple projects

## Gotchas

| Issue | Fix |
|---|---|
| No results | Broaden query or remove --project |
| CLI not installed | Run \`npm install -g @yavydev/cli\` then \`yavy login\` |
| Stale project list | Re-run \`yavy init\` to refresh |
`;
}

export function generateProjectContent(project: ApiProject): string {
    return `# ${project.name}

- **Organization**: ${project.organization.name} (\`${project.organization.slug}\`)
- **Slug**: \`${project.organization.slug}/${project.slug}\`
- **Pages**: ${project.pages_count}
${project.description ? `- **Description**: ${project.description}` : ''}

## Search This Project

\`\`\`bash
yavy search "your query" --project ${project.organization.slug}/${project.slug}
\`\`\`
`;
}

export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 3) + '...';
}

function escapePipe(str: string): string {
    return str.replace(/\|/g, '\\|');
}

function escapeYaml(str: string): string {
    return str.replace(/"/g, '\\"');
}
