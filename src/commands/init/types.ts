export enum AiTool {
    ClaudeCode = 'claude-code',
    Cursor = 'cursor',
    Vscode = 'vscode',
    Windsurf = 'windsurf',
    OpenCode = 'opencode',
}

export type Scope = 'project' | 'user';

export interface ToolConfig {
    name: string;
    detectDir: string;
    skillDir: string;
    userSkillDir: string | null;
    mcpConfigPath: string | null;
    mcpFormat: 'json' | 'embedded' | null;
    mcpServerKey?: string;
}

export interface InitOptions {
    tool?: string;
    projects?: string;
    scope?: Scope;
    yes?: boolean;
}

export const TOOL_CONFIGS: Record<AiTool, ToolConfig> = {
    [AiTool.ClaudeCode]: {
        name: 'Claude Code',
        detectDir: '.claude',
        skillDir: '.claude/skills/yavy',
        userSkillDir: '.claude/skills/yavy',
        mcpConfigPath: null,
        mcpFormat: null,
    },
    [AiTool.Cursor]: {
        name: 'Cursor',
        detectDir: '.cursor',
        skillDir: '.cursor/rules/yavy',
        userSkillDir: null, // Cursor has no filesystem-based global rules path
        mcpConfigPath: '.cursor/mcp.json',
        mcpFormat: 'json',
    },
    [AiTool.Vscode]: {
        name: 'VS Code',
        detectDir: '.vscode',
        skillDir: '.github/instructions/yavy',
        userSkillDir: '.copilot/instructions/yavy',
        mcpConfigPath: '.vscode/mcp.json',
        mcpFormat: 'json',
    },
    [AiTool.Windsurf]: {
        name: 'Windsurf',
        detectDir: '.windsurf',
        skillDir: '.windsurf/rules/yavy',
        userSkillDir: null, // Windsurf uses a single global file, not a directory
        mcpConfigPath: null,
        mcpFormat: null,
    },
    [AiTool.OpenCode]: {
        name: 'OpenCode',
        detectDir: '.opencode',
        skillDir: '.opencode/skills/yavy',
        userSkillDir: '.config/opencode/skills/yavy',
        mcpConfigPath: 'opencode.json',
        mcpFormat: 'embedded',
        mcpServerKey: 'mcp',
    },
};
