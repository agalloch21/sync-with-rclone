import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { probeDevServer, waitForDevServer } from './dev-server.js'

const require = createRequire(import.meta.url)
const currentDirPath = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDirPath, '../..')

const VITE_PORT = 5173
const VITE_HOST = '127.0.0.1'
const DEV_SERVER_URL = `http://${VITE_HOST}:${VITE_PORT}`
const viteBinPath = path.resolve(projectRoot, 'node_modules/vite/bin/vite.js')
const electronBinary = require('electron')

const electronMainEntry = path.resolve(projectRoot, 'src/electron/main/index.cjs')
const forwardedArgs = process.argv.slice(2)

function terminateChild(childProcess) {
  if (!childProcess || childProcess.killed)
    return

  childProcess.kill('SIGTERM')
}

let viteProcess = null
let electronProcess = null
let shuttingDown = false

function shutdown(exitCode = 0) {
  if (shuttingDown)
    return

  shuttingDown = true
  terminateChild(electronProcess)
  terminateChild(viteProcess)
  process.exit(exitCode)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

async function main() {
  const existingServer = await probeDevServer({
    port: VITE_PORT,
    host: VITE_HOST,
  })

  if (existingServer.status === 'occupied')
    throw new Error(`Port ${VITE_PORT} is occupied by another service.`)

  if (existingServer.status === 'available') {
    viteProcess = spawn(process.execPath, [viteBinPath, '--host', VITE_HOST, '--strictPort'], {
      stdio: 'inherit',
      env: process.env,
      cwd: projectRoot,
    })

    viteProcess.on('exit', (code) => {
      if (shuttingDown)
        return

      shutdown(code ?? 1)
    })

    await waitForDevServer({
      port: VITE_PORT,
      host: VITE_HOST,
    })
  }

  const childEnv = {
    ...process.env,
    ELECTRON_RENDERER_DEV_SERVER_URL: DEV_SERVER_URL,
    DEBUG_ELECTRON: process.env.DEBUG_ELECTRON || '1',
  }

  delete childEnv.ELECTRON_RUN_AS_NODE

  electronProcess = spawn(electronBinary, [electronMainEntry, ...forwardedArgs], {
    stdio: 'inherit',
    env: childEnv,
  })

  electronProcess.on('exit', (code) => {
    shutdown(code ?? 0)
  })
}

main()
  .catch((error) => {
    console.error(error.message)
    shutdown(1)
  })
