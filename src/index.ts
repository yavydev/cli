import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { projectsCommand } from './commands/projects.js';
import { generateCommand } from './commands/generate.js';

const program = new Command();

program
  .name('yavy')
  .description('Generate AI skills from your indexed documentation')
  .version('0.1.0');

program.addCommand(loginCommand());
program.addCommand(logoutCommand());
program.addCommand(projectsCommand());
program.addCommand(generateCommand());

program.parse();
