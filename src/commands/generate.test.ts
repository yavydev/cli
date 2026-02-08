import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeFileSync } from 'node:fs';
import { generateCommand } from './generate.js';

vi.mock('../api/client.js', () => ({
    YavyApiClient: {
        create: vi.fn(),
    },
}));

vi.mock('../utils/paths.js', () => ({
    getSkillOutputPath: vi.fn(() => '/mock/output/SKILL.md'),
    ensureParentDir: vi.fn(),
}));

vi.mock('../utils/output.js', () => ({
    error: vi.fn(),
    success: vi.fn(),
}));

vi.mock('node:fs', () => ({
    writeFileSync: vi.fn(),
}));

vi.mock('chalk', () => ({
    default: {
        bold: (s: string) => s,
        dim: (s: string) => s,
    },
}));

vi.mock('ora', () => ({
    default: vi.fn(() => ({
        start: vi.fn().mockReturnThis(),
        stop: vi.fn(),
        fail: vi.fn(),
    })),
}));

import { YavyApiClient } from '../api/client.js';
import { getSkillOutputPath, ensureParentDir } from '../utils/paths.js';
import { error, success } from '../utils/output.js';

function createMockClient() {
    return {
        generateSkill: vi.fn().mockResolvedValue({
            content: '# Skill Content',
            format: 'md',
            generated_at: '2024-01-01',
            token_count: 500,
            project: { name: 'My Project', slug: 'my-project' },
        }),
        listProjects: vi.fn(),
        getSkill: vi.fn(),
    };
}

async function run(args: string[], opts: string[] = []) {
    const cmd = generateCommand();
    cmd.exitOverride();
    cmd.configureOutput({ writeErr: () => {} });
    try {
        await cmd.parseAsync([...args, ...opts], { from: 'user' });
    } catch {
        // Commander throws on exitOverride
    }
}

describe('generateCommand', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    it('rejects invalid slug format (no /)', async () => {
        await run(['invalid-slug']);
        expect(error).toHaveBeenCalledWith(expect.stringContaining('Invalid slug format'));
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('rejects slug with multiple /', async () => {
        await run(['a/b/c']);
        expect(error).toHaveBeenCalledWith(expect.stringContaining('Invalid slug format'));
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('calls generateSkill with correct org/project/force args', async () => {
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['my-org/my-project', '--force']);

        expect(mockClient.generateSkill).toHaveBeenCalledWith('my-org', 'my-project', true);
    });

    it('writes skill content to computed output path', async () => {
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['my-org/my-project']);

        expect(ensureParentDir).toHaveBeenCalledWith('/mock/output/SKILL.md');
        expect(writeFileSync).toHaveBeenCalledWith('/mock/output/SKILL.md', '# Skill Content', 'utf-8');
        expect(success).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is used', async () => {
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['my-org/my-project', '--json']);

        const logCall = vi.mocked(console.log).mock.calls[0][0] as string;
        const parsed = JSON.parse(logCall);
        expect(parsed).toHaveProperty('path');
        expect(parsed).toHaveProperty('project');
        expect(parsed).toHaveProperty('token_count');
    });

    it('shows error and exits on API failure', async () => {
        vi.mocked(YavyApiClient.create).mockRejectedValue(new Error('Not authenticated'));

        await run(['my-org/my-project']);

        expect(error).toHaveBeenCalledWith('Not authenticated');
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('passes options to getSkillOutputPath', async () => {
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['my-org/my-project', '--global']);

        expect(getSkillOutputPath).toHaveBeenCalledWith(
            'my-project',
            expect.objectContaining({ global: true }),
        );
    });
});
