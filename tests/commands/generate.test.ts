import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCommand } from '@/commands/generate';

vi.mock('@/api/client', () => ({
    YavyApiClient: {
        create: vi.fn(),
    },
}));

vi.mock('@/utils/paths', () => ({
    getSkillOutputDir: vi.fn(() => '/mock/output/my-project'),
    ensureDir: vi.fn(),
    isPathSafe: vi.fn(() => true),
}));

vi.mock('@/utils/output', () => ({
    error: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
}));

vi.mock('node:fs', () => ({
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(() => Buffer.from('')),
    existsSync: vi.fn(() => false),
    readdirSync: vi.fn(() => []),
    mkdirSync: vi.fn(),
}));

vi.mock('fflate', () => ({
    unzipSync: vi.fn(() => ({
        'my-project/SKILL.md': new Uint8Array([72, 101, 108, 108, 111]),
        'my-project/references/doc.md': new Uint8Array([68, 111, 99]),
        'my-project/': new Uint8Array(0), // directory entry
    })),
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

import { existsSync } from 'node:fs';
import { YavyApiClient } from '@/api/client';
import { error, warn } from '@/utils/output';
import { getSkillOutputDir, isPathSafe } from '@/utils/paths';

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

        expect(getSkillOutputDir).toHaveBeenCalledWith('my-project', expect.objectContaining({ global: true }));
    });

    it('warns and exits when skill exists without --force', async () => {
        vi.mocked(existsSync).mockReturnValue(true);

        await run(['my-org/my-project']);

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('already exist'));
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('overwrites existing skill when --force is used', async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['my-org/my-project', '--force']);

        expect(mockClient.downloadSkill).toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
    });

    it('throws on unsafe zip paths (zip-slip protection)', async () => {
        vi.mocked(isPathSafe).mockReturnValue(false);
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['my-org/my-project']);

        expect(error).toHaveBeenCalledWith(expect.stringContaining('unsafe path'));
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('passes --output flag to getSkillOutputDir', async () => {
        const mockClient = createMockClient();
        vi.mocked(YavyApiClient.create).mockResolvedValue(mockClient as unknown as YavyApiClient);

        await run(['my-org/my-project', '--output', '/custom/path']);

        expect(getSkillOutputDir).toHaveBeenCalledWith('my-project', expect.objectContaining({ output: '/custom/path' }));
    });
});
