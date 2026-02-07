import { Command } from 'commander';
import { clearCredentials, loadCredentials } from '../auth/store.js';
import { success, info } from '../utils/output.js';

export function logoutCommand(): Command {
  return new Command('logout')
    .description('Log out of your Yavy account')
    .action(() => {
      const existing = loadCredentials();
      if (!existing) {
        info('You are not logged in.');
        return;
      }

      clearCredentials();
      success('Logged out of Yavy.');
    });
}
