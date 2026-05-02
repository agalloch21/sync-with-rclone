import { parseSyncArgs } from '#src/app/parse-sync-args.js'
import { startSync } from '#src/app/start-sync.js'
import { SYNC_RESULT } from '#src/core/contract.js'
import { reviewDiffInCli } from './review.js'

const options = parseSyncArgs(process.argv.slice(2))

;(async () => {
  try {
    const result = await startSync(options, {
      interactions: {
        reviewDiff: reviewDiffInCli,
      },
    })

    if (result.result === SYNC_RESULT.FAILED) {
      console.error(`Error: ${result.message}`)
      if (result.error?.stack && process.env.DEBUG)
        console.error(result.error.stack)
      process.exit(1)
    }
  }
  catch (error) {
    console.error(`Error: ${error.message}`)
    if (error.stack && process.env.DEBUG)
      console.error(error.stack)
    process.exit(1)
  }
})()
