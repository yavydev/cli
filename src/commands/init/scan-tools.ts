import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AiTool, TOOL_CONFIGS } from '@/commands/init/types';

const SCANNABLE_TOOLS = [AiTool.ClaudeCode, AiTool.Cursor, AiTool.Vscode, AiTool.Windsurf, AiTool.OpenCode] as const;

export function scanForTools(cwd: string): AiTool[] {
    const detected: AiTool[] = [];

    for (const tool of SCANNABLE_TOOLS) {
        const config = TOOL_CONFIGS[tool];
        if (existsSync(join(cwd, config.detectDir))) {
            detected.push(tool);
        }
    }

    return detected;
}

export function resolveToolFromFlag(toolFlag: string): AiTool | null {
    const normalized = toolFlag.toLowerCase().replace(/\s+/g, '-');

    for (const [key, config] of Object.entries(TOOL_CONFIGS)) {
        if (key === normalized || config.name.toLowerCase().replace(/\s+/g, '-') === normalized) {
            return key as AiTool;
        }
    }

    return null;
}
