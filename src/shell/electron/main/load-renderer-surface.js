import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isValidRendererSurface } from '#electron/contracts/renderer-surface.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rendererDistDirectory = path.join(__dirname, '../renderer/dist')

function normalizeDevServerUrl(input) {
  return input ? input.replace(/\/$/, '') : ''
}

function getRendererSurfaceTarget(surface) {
  if (!isValidRendererSurface(surface))
    throw new TypeError(`Unknown renderer surface: ${surface}`)

  const devServerUrl = normalizeDevServerUrl(process.env.ELECTRON_RENDERER_DEV_SERVER_URL)

  if (devServerUrl) {
    return {
      type: 'url',
      value: `${devServerUrl}/?surface=${encodeURIComponent(surface)}`,
    }
  }

  return {
    type: 'file',
    value: path.join(rendererDistDirectory, 'index.html'),
  }
}

export function loadRendererSurface(browserWindow, surface) {
  const target = getRendererSurfaceTarget(surface)
  return target.type === 'url'
    ? browserWindow.loadURL(target.value)
    : browserWindow.loadFile(target.value, { query: { surface } })
}
