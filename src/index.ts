import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { generateCommand } from './commands/generate';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { projectsCommand } from './commands/projects';
import { error } from './utils';

const program = new Command();

program.name('yavy').description('Generate AI skills from your indexed documentation').version(pkg.version);

program.addCommand(loginCommand());
program.addCommand(logoutCommand());
program.addCommand(projectsCommand());
program.addCommand(generateCommand());

program.parseAsync().catch((err: unknown) => {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
});
