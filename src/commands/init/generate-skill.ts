import type { ApiProject } from '@/api/client';

export function generateSkillContent(projects: ApiProject[]): string {
    const projectNames = projects.map((p) => p.name).join(', ');
    const description = `Search indexed documentation for ${projectNames}. Use when user needs reference info, asks 'how does X work', or needs API/feature lookups from these projects.`;

    const projectList = projects
        .map((p) => {
            const ctx = p.context;
            const productName = ctx.product ?? p.name;
            const slug = slugify(p.slug);
            const desc = p.description ? ` — ${p.description}` : '';
            const domain = ctx.domain ? ` (${ctx.domain}${ctx.version ? ` ${ctx.version}` : ''})` : '';
            return `- **[${escapePipe(productName)}](projects/${slug}.md)**${domain}${desc}`;
        })
        .join('\n');

    return `---
name: yavy
description: "${truncate(escapeYaml(description), 500)}"
allowed-tools: ['Bash']
---

# Yavy Documentation Search

Search across all indexed content. Read the linked project files for full context on each project.

## Projects

${projectList}

## When to Use This Skill

Search here when:
- User needs information from indexed content
- Query matches topics covered by projects above

Do NOT search here when:
- User needs real-time data or actions (this is read-only search)

## Commands

| Command | Purpose |
|---------|---------|
| \`yavy search "query"\` | Search all projects |
| \`yavy search "query" --project slug\` | Search one project |
| \`yavy search "query" --json\` | JSON output for parsing |

## Tips

- Describe what you're trying to accomplish
- Ask specific questions for better matches
- Use the \`--project\` flag to narrow results when query clearly scopes to one domain
`;
}

export function generateProjectContent(project: ApiProject): string {
    const ctx = project.context;
    const productName = ctx.product ?? project.name;
    const description = project.description ?? '';
    const type = ctx.type ?? 'Documentation';
    const domain = ctx.domain ?? '';
    const version = ctx.version ?? '';
    const complexity = ctx.complexity ?? '';
    const audience = ctx.target_audience.length > 0 ? ctx.target_audience.join(', ') : 'Developers';

    const lines: string[] = [];

    lines.push(`# ${productName}`);
    lines.push('');

    if (description) {
        lines.push(description);
        lines.push('');
    }

    // Metadata
    const metaParts = [`**Type:** ${type}`];
    if (domain) metaParts.push(`**Domain:** ${domain}`);
    if (version) metaParts.push(`**Version:** ${version}`);
    lines.push(metaParts.join(' | '));

    if (complexity) {
        lines.push(`**Complexity:** ${complexity}`);
    }

    lines.push(`**Audience:** ${audience}`);

    if (ctx.languages.length > 0) {
        lines.push(`**Languages:** ${ctx.languages.join(', ')}`);
    }

    if (ctx.related_technologies.length > 0) {
        lines.push(`**Related Technologies:** ${ctx.related_technologies.join(', ')}`);
    }

    if (ctx.key_topics.length > 0) {
        lines.push('');
        lines.push('## Key Topics');
        lines.push(ctx.key_topics.join(', '));
    }

    if (ctx.key_concepts.length > 0) {
        lines.push('');
        lines.push('## Key Concepts');
        lines.push(ctx.key_concepts.join(', '));
    }

    if (ctx.example_queries.length > 0) {
        lines.push('');
        lines.push('## Example Questions');
        for (const query of ctx.example_queries) {
            lines.push(`- ${query}`);
        }
    }

    if (ctx.content_structure.length > 0) {
        lines.push('');
        lines.push('## Content Structure');
        for (const section of ctx.content_structure) {
            lines.push(`- **${section.name}** (${section.page_count} pages)`);
        }
    }

    lines.push('');
    lines.push('## Search This Project');
    lines.push('');
    lines.push('```bash');
    lines.push(`yavy search "your query" --project ${project.slug}`);
    lines.push('```');
    lines.push('');

    return lines.join('\n');
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
    return str.replace(/\\/g, '\\\\').replace(/\n/g, ' ').replace(/\r/g, '').replace(/"/g, '\\"');
}
