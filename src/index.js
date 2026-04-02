import { startSync } from './app/start-sync.js'
import { reviewDiffInCli } from './cli/review.js'

const args = process.argv.slice(2);

// Main execution
(async () => {
  try {
    await startSync({
      mode: args[0] || 'push',
      localFolderPath: args[1],
      remoteFolderPath: args[2] || ''
    }, {
      reviewDiff: reviewDiffInCli
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
})();
