import { startSync } from '#src/app/start-sync.js'
import { parseSyncArgs } from '#src/app/parse-sync-args.js'
import { reviewDiffInCli } from './review.js'

const options = parseSyncArgs(process.argv.slice(2))

;(async () => {
  try {
    await startSync(options, {
      reviewDiff: reviewDiffInCli,
    })
  }
  catch (error) {
    console.error(`Error: ${error.message}`)
    if (error.stack && process.env.DEBUG)
      console.error(error.stack)
    process.exit(1)
  }
})()
