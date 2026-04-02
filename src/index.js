import { syncCore } from './core/sync-engine.js'
import { serializeDiffSnapshot } from './core/serialize-diff-snapshot.js'

const args = process.argv.slice(2);

// Main execution
(async () => {
  try {
    await syncCore({
      mode: args[0] || 'push',
      localFolderPath: args[1],
      remoteFolderPath: args[2] || ''
    }, {
      async reviewDiff(diffSnapshot) {
        console.log(JSON.stringify(serializeDiffSnapshot(diffSnapshot), null, 2))
        return {
          action: 'accept',
        }
      }
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.stack && process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
})();
