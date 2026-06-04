import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rendererDistDirectory = path.join(__dirname, '../renderer/dist')

function normalizeDevServerUrl(input) {
  return input ? input.replace(/\/$/, '') : ''
}

function getRendererEntryTarget(entryName) {
  const devServerUrl = normalizeDevServerUrl(process.env.ELECTRON_RENDERER_DEV_SERVER_URL)

  if (devServerUrl) {
    return {
      type: 'url',
      value: `${devServerUrl}/${entryName}.html`,
    }
  }

  return {
    type: 'file',
    value: path.join(rendererDistDirectory, `${entryName}.html`),
  }
}

export function loadRendererEntry(browserWindow, entryName) {
  const target = getRendererEntryTarget(entryName)
  return target.type === 'url'
    ? browserWindow.loadURL(target.value)
    : browserWindow.loadFile(target.value)
}
