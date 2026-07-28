import http from 'node:http'

const EXPECTED_ENTRY = 'src/entries/sync-session.js'

function requestDevServerPage({
  host = '127.0.0.1',
  port = 5173,
  timeoutMs = 1000,
} = {}) {
  return new Promise((resolve, reject) => {
    const request = http.get({
      host,
      port,
      path: '/sync-session.html',
      timeout: timeoutMs,
    }, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', chunk => body += chunk)
      response.on('end', () => {
        resolve({ statusCode: response.statusCode, body })
      })
    })

    request.on('timeout', () => request.destroy())
    request.on('error', reject)
  })
}

export async function probeDevServer(options = {}) {
  try {
    const response = await requestDevServerPage(options)
    return {
      status: response.statusCode === 200 && response.body.includes(EXPECTED_ENTRY)
        ? 'ready'
        : 'occupied',
    }
  }
  catch (error) {
    return {
      status: error?.code === 'ECONNREFUSED' ? 'available' : 'occupied',
      error,
    }
  }
}

export async function waitForDevServer(options = {}) {
  const timeoutMs = options.timeoutMs ?? 30000
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const result = await probeDevServer(options)
    if (result.status === 'ready')
      return
    if (result.status === 'occupied')
      throw new Error(`Port ${options.port ?? 5173} is occupied by another service.`)

    await new Promise(resolve => setTimeout(resolve, 250))
  }

  throw new Error(`Timed out waiting for dev server at ${options.host ?? '127.0.0.1'}:${options.port ?? 5173}`)
}
