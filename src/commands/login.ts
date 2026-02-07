import { Command } from 'commander';
import ora from 'ora';
import { performOAuthLogin } from '../auth/oauth.js';
import { loadCredentials } from '../auth/store.js';
import { success, error, info } from '../utils/output.js';

export function loginCommand(): Command {
  return new Command('login')
    .description('Log in to your Yavy account')
    .action(async () => {
      const existing = loadCredentials();
      if (existing?.access_token) {
        info('You are already logged in. Use `yavy logout` first to switch accounts.');
        return;
      }

      const spinner = ora('Opening browser for authentication...').start();

      try {
        const result = await performOAuthLogin();
        spinner.stop();

        if (result) {
          success('Successfully logged in to Yavy!');
        } else {
          error('Login failed. Please try again.');
          process.exit(1);
        }
      } catch (err) {
        spinner.stop();
        error(`Login failed: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
