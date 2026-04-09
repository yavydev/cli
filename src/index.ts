import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { generateCommand } from '@/commands/generate';
import { initCommand } from '@/commands/init';
import { loginCommand } from '@/commands/login';
import { logoutCommand } from '@/commands/logout';
import { createProjectCommand } from '@/commands/project/create';
import { projectsCommand } from '@/commands/projects';
import { searchCommand } from '@/commands/search';
import { error } from '@/utils';

const program = new Command();

program.name('yavy').description('Search and manage your AI-ready documentation').version(pkg.version);

const projectCmd = new Command('project').description('Manage documentation projects');
projectCmd.addCommand(createProjectCommand());

program.addCommand(loginCommand());
program.addCommand(logoutCommand());
program.addCommand(projectsCommand());
program.addCommand(searchCommand());
program.addCommand(generateCommand());
program.addCommand(initCommand());
program.addCommand(projectCmd);

program.parseAsync().catch((err: unknown) => {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
