import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const VITE_PORT = 5173
const VITE_HOST = '127.0.0.1'
const DEV_SERVER_URL = `http://${VITE_HOST}:${VITE_PORT}`
const viteBinPath = path.resolve('node_modules/vite/bin/vite.js')
const electronBinary = require('electron')

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
    electronProcess = spawn(electronBinary, ['.'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        APP_ROOT_PATH: path.resolve('.'),
        ELECTRON_RENDERER_DEV_SERVER_URL: DEV_SERVER_URL,
        DEBUG_ELECTRON: process.env.DEBUG_ELECTRON || '1',
      },
    })

    electronProcess.on('exit', (code) => {
      shutdown(code ?? 0)
    })
  })
  .catch((error) => {
    console.error(error.message)
    shutdown(1)
  })
