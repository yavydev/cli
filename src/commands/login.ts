import { Command } from 'commander';
import ora from 'ora';
import { performOAuthLogin } from '@/auth/oauth';
import { isExpired, loadCredentials } from '@/auth/store';
import { error, info, success, warn } from '@/utils';

export function loginCommand(): Command {
    return new Command('login').description('Log in to your Yavy account').action(async () => {
        const existing = loadCredentials();
        if (existing?.access_token && !isExpired(existing)) {
            info('You are already logged in. Use `yavy logout` first to switch accounts.');
            return;
        }

        if (existing && isExpired(existing)) {
            warn('Your session has expired. Re-authenticating...');
        }

        const spinner = ora('Opening browser for authentication...').start();

        try {
            const result = await performOAuthLogin();
            spinner.stop();

            if (result) {
                success('Successfully logged in to Yavy!');
                process.exit(0);
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
