import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const currentDirPath = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDirPath, '..')

const VITE_PORT = 5173
const VITE_HOST = '127.0.0.1'
const DEV_SERVER_URL = `http://${VITE_HOST}:${VITE_PORT}`
const viteBinPath = path.resolve(projectRoot, 'node_modules/vite/bin/vite.js')
const electronBinary = require('electron')

const electronMainEntry = path.resolve(projectRoot, 'src/electron/main/index.cjs')
const forwardedArgs = process.argv.slice(2)

function waitForPort(port, host, timeoutMs = 30000) {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    function tryConnect() {
      const socket = net.createConnection({ port, host })

      socket.once('connect', () => {
        socket.end()
        resolve()
      })

      socket.once('error', () => {
        socket.destroy()

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for dev server at ${host}:${port}`))
          return
        }

        setTimeout(tryConnect, 250)
      })
    }

    tryConnect()
  })
}

function terminateChild(childProcess) {
  if (!childProcess || childProcess.killed)
    return

  childProcess.kill('SIGTERM')
}

const viteProcess = spawn(process.execPath, [viteBinPath, '--host', VITE_HOST, '--strictPort'], {
  stdio: 'inherit',
  env: process.env,
  cwd: projectRoot,
})

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

viteProcess.on('exit', (code) => {
  if (shuttingDown)
    return

  shutdown(code ?? 1)
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

waitForPort(VITE_PORT, VITE_HOST)
  .then(() => {
    const childEnv = {
      ...process.env,
      APP_ROOT_PATH: path.resolve('.'),
      ELECTRON_RENDERER_DEV_SERVER_URL: DEV_SERVER_URL,
      DEBUG_ELECTRON: process.env.DEBUG_ELECTRON || '1',
    }

    delete childEnv.ELECTRON_RUN_AS_NODE

    electronProcess = spawn(electronBinary, [electronMainEntry, ...forwardedArgs], {
      stdio: 'inherit',
      env: childEnv,
      cwd: projectRoot,
    })

    electronProcess.on('exit', (code) => {
      shutdown(code ?? 0)
    })
  })
  .catch((error) => {
    console.error(error.message)
    shutdown(1)
  })
