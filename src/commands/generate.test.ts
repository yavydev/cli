import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCommand } from './generate.js';

vi.mock('../api/client.js', () => ({
    YavyApiClient: {
        create: vi.fn(),
    },
}));

vi.mock('../utils/paths.js', () => ({
    getSkillOutputDir: vi.fn(() => '/mock/output/my-project'),
    ensureDir: vi.fn(),
}));

vi.mock('../utils/output.js', () => ({
    error: vi.fn(),
    success: vi.fn(),
}));

vi.mock('node:fs', () => ({
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(() => Buffer.from('')),
    existsSync: vi.fn(() => false),
    readdirSync: vi.fn(() => []),
    rmSync: vi.fn(),
    mkdirSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({
    execFileSync: vi.fn(),
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
import { getSkillOutputDir } from '../utils/paths.js';
import { error, success } from '../utils/output.js';

function createMockClient() {
    return {
        downloadSkill: vi.fn().mockResolvedValue(new ArrayBuffer(100)),
        listProjects: vi.fn(),
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

    it('calls downloadSkill with correct org/project args', async () => {
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['my-org/my-project']);

        expect(mockClient.downloadSkill).toHaveBeenCalledWith('my-org', 'my-project');
    });

    it('outputs JSON when --json flag is used', async () => {
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['my-org/my-project', '--json']);

        const logCall = vi.mocked(console.log).mock.calls[0][0] as string;
        const parsed = JSON.parse(logCall);
        expect(parsed).toHaveProperty('path');
        expect(parsed).toHaveProperty('skill_file');
        expect(parsed).toHaveProperty('reference_count');
    });

    it('shows error and exits on API failure', async () => {
        vi.mocked(YavyApiClient.create).mockRejectedValue(new Error('Not authenticated'));

        await run(['my-org/my-project']);

        expect(error).toHaveBeenCalledWith('Not authenticated');
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('passes options to getSkillOutputDir', async () => {
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['my-org/my-project', '--global']);

        expect(getSkillOutputDir).toHaveBeenCalledWith(
            'my-project',
            expect.objectContaining({ global: true }),
        );
    });
});
