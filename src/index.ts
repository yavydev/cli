import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { generateCommand } from './commands/generate.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { projectsCommand } from './commands/projects.js';

const program = new Command();

program.name('yavy').description('Generate AI skills from your indexed documentation').version(pkg.version);

program.addCommand(loginCommand());
program.addCommand(logoutCommand());
program.addCommand(projectsCommand());
program.addCommand(generateCommand());

program.parse();
