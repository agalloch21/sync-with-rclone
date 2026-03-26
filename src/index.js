import { syncCore } from './core/sync-engine.js'

const args = process.argv.slice(2);

// Main execution
(async () => {
  try {
    await syncCore({
      srcFolder: args[0],
      destFolder: args[1] || ''
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
})();

