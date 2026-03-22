import { describe, expect, it } from 'vitest';
import type { ApiProject } from '@/api/client';
import { generateProjectContent, generateSkillContent, slugify } from '@/commands/init/generate-skill';

function makeProject(overrides: Partial<ApiProject> = {}): ApiProject {
    return {
        id: 1,
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        organization: { name: 'Test Org', slug: 'test-org' },
        pages_count: 42,
        last_indexed_at: '2024-01-01T00:00:00Z',
        has_indexed_content: true,
        context: {
            product: null,
            type: null,
            domain: null,
            version: null,
            complexity: null,
            target_audience: [],
            key_topics: [],
            key_concepts: [],
            example_queries: [],
            related_technologies: [],
            languages: [],
            content_structure: [],
        },
        ...overrides,
    };
}

describe('generateSkillContent', () => {
    it('generates valid SKILL.md with frontmatter', () => {
        const content = generateSkillContent([makeProject()]);

        expect(content).toContain('---');
        expect(content).toContain('name: yavy');
        expect(content).toContain('allowed-tools:');
    });

    it('includes project names in description', () => {
        const content = generateSkillContent([makeProject({ name: 'React Docs' }), makeProject({ name: 'Vue Guide', slug: 'vue-guide' })]);

        expect(content).toContain('React Docs, Vue Guide');
    });

    it('lists all projects with links to project files', () => {
        const projects = [
            makeProject({ name: 'Alpha', slug: 'alpha', organization: { name: 'Org', slug: 'org' } }),
            makeProject({ name: 'Beta', slug: 'beta', organization: { name: 'Org', slug: 'org' } }),
        ];

        const content = generateSkillContent(projects);

        expect(content).toContain('**[Alpha](projects/alpha.md)**');
        expect(content).toContain('**[Beta](projects/beta.md)**');
        expect(content).toContain('## Projects');
    });

    it('includes commands table', () => {
        const content = generateSkillContent([makeProject()]);

        expect(content).toContain('yavy search "query"');
        expect(content).toContain('yavy search "query" --project slug');
        expect(content).toContain('yavy search "query" --json');
    });

    it('includes when-to-use section', () => {
        const content = generateSkillContent([makeProject()]);

        expect(content).toContain('## When to Use This Skill');
        expect(content).toContain('Do NOT search here when');
    });

    it('links to project file with description and domain when available', () => {
        const content = generateSkillContent([
            makeProject({
                slug: 'my-project',
                description: 'Some docs',
                context: {
                    ...makeProject().context,
                    domain: 'web',
                    version: 'v2',
                },
            }),
        ]);

        expect(content).toContain('**[Test Project](projects/my-project.md)**');
        expect(content).toContain('(web v2)');
        expect(content).toContain('Some docs');
    });

    it('escapes pipe characters in project names for table rows', () => {
        const content = generateSkillContent([makeProject({ name: 'Alpha | Beta' })]);

        expect(content).toContain('Alpha \\| Beta');
        expect(content).not.toMatch(/\| Alpha \| Beta \|/);
    });

    it('escapes double quotes in frontmatter description', () => {
        const content = generateSkillContent([makeProject({ name: 'Say "Hello"' })]);

        const descriptionMatch = content.match(/description: "(.+)"/);
        expect(descriptionMatch).toBeTruthy();
        expect(descriptionMatch![1]).toContain('Say \\"Hello\\"');
    });

    it('truncates description to 500 chars', () => {
        const projects = Array.from({ length: 50 }, (_, i) => makeProject({ name: `Very Long Project Name Number ${i}`, slug: `project-${i}` }));

        const content = generateSkillContent(projects);
        const descriptionMatch = content.match(/description: "(.+)"/);
        expect(descriptionMatch).toBeTruthy();
        expect(descriptionMatch![1].length).toBeLessThanOrEqual(500);
    });
});

describe('generateProjectContent', () => {
    it('generates project markdown with metadata', () => {
        const content = generateProjectContent(makeProject());

        expect(content).toContain('# Test Project');
        expect(content).toContain('**Type:** Documentation');
        expect(content).toContain('**Audience:** Developers');
    });

    it('includes description when present', () => {
        const content = generateProjectContent(makeProject({ description: 'My docs' }));
        expect(content).toContain('My docs');
    });

    it('omits description when null', () => {
        const content = generateProjectContent(makeProject({ description: null }));
        expect(content).not.toContain('**Description**');
    });

    it('includes search command with correct slug', () => {
        const content = generateProjectContent(makeProject());
        expect(content).toContain('yavy search "your query" --project test-project');
    });
});

describe('slugify', () => {
    it('lowercases and replaces non-alphanumeric with hyphens', () => {
        expect(slugify('My Project')).toBe('my-project');
        expect(slugify('Hello World!')).toBe('hello-world');
    });

    it('strips leading/trailing hyphens', () => {
        expect(slugify('--test--')).toBe('test');
    });

    it('collapses multiple separators', () => {
        expect(slugify('a   b...c')).toBe('a-b-c');
    });

    it('handles already-slugified input', () => {
        expect(slugify('already-slugified')).toBe('already-slugified');
    });
});
