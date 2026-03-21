export enum AiTool {
    ClaudeCode = 'claude-code',
    Cursor = 'cursor',
    Vscode = 'vscode',
    Windsurf = 'windsurf',
    OpenCode = 'opencode',
    Other = 'other',
}

export interface ToolConfig {
    name: string;
    detectDir: string;
    skillDir: string;
    mcpConfigPath: string | null;
    mcpFormat: 'json' | 'embedded' | null;
    mcpServerKey?: string;
}

export interface InitOptions {
    tool?: string;
    yes?: boolean;
}

export const TOOL_CONFIGS: Record<AiTool, ToolConfig> = {
    [AiTool.ClaudeCode]: {
        name: 'Claude Code',
        detectDir: '.claude',
        skillDir: '.claude/skills/yavy',
        mcpConfigPath: null,
        mcpFormat: null,
    },
    [AiTool.Cursor]: {
        name: 'Cursor',
        detectDir: '.cursor',
        skillDir: '.cursor/rules/yavy',
        mcpConfigPath: '.cursor/mcp.json',
        mcpFormat: 'json',
    },
    [AiTool.Vscode]: {
        name: 'VS Code',
        detectDir: '.vscode',
        skillDir: '.github/instructions/yavy',
        mcpConfigPath: '.vscode/mcp.json',
        mcpFormat: 'json',
    },
    [AiTool.Windsurf]: {
        name: 'Windsurf',
        detectDir: '.windsurf',
        skillDir: '.windsurf/rules/yavy',
        mcpConfigPath: null,
        mcpFormat: null,
    },
    [AiTool.OpenCode]: {
        name: 'OpenCode',
        detectDir: '.opencode',
        skillDir: '.opencode/skills/yavy',
        mcpConfigPath: 'opencode.json',
        mcpFormat: 'embedded',
        mcpServerKey: 'mcp',
    },
    [AiTool.Other]: {
        name: 'Other',
        detectDir: '',
        skillDir: 'yavy-skills',
        mcpConfigPath: null,
        mcpFormat: null,
    },
};
