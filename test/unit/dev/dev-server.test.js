import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'

import { probeDevServer } from '../../../scripts/dev/dev-server.js'

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return server.address().port
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })
}

async function withServer(body, callback) {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end(body)
  })
  const port = await listen(server)
  try {
    return await callback(port)
  }
  finally {
    await close(server)
  }
}

test('probeDevServer distinguishes the project renderer from an unrelated service', async () => {
  const ready = await withServer(
    '<script src="./src/entries/sync-session.js"></script>',
    port => probeDevServer({ port }),
  )
  const occupied = await withServer(
    'another service',
    port => probeDevServer({ port }),
  )

  assert.deepEqual(ready, { status: 'ready' })
  assert.deepEqual(occupied, { status: 'occupied' })
})

test('probeDevServer reports an unused port as available', async () => {
  const server = http.createServer()
  const port = await listen(server)
  await close(server)

  const result = await probeDevServer({ port })
  assert.equal(result.status, 'available')
})
