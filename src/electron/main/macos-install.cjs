const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { spawn } = require('node:child_process')

const APP_SUPPORT_DIRECTORY = path.join(os.homedir(), 'Library', 'Application Support', 'sync-with-rclone')
const CONFIG_DIRECTORY = path.join(APP_SUPPORT_DIRECTORY, 'config')
const LOG_DIRECTORY = path.join(APP_SUPPORT_DIRECTORY, 'logs')
const CONTEXT_MENU_STATE_PATH = path.join(APP_SUPPORT_DIRECTORY, 'context-menu-state.json')

function getTemplatePath(name) {
  return path.join(process.resourcesPath, 'templates', name)
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true })
}

async function ensureFile(targetPath, templatePath, fallbackContent) {
  try {
    await fs.access(targetPath)
    return false
  }
  catch {}

  await ensureDirectory(path.dirname(targetPath))

  try {
    await fs.copyFile(templatePath, targetPath)
  }
  catch (error) {
    if (error?.code !== 'ENOENT')
      throw error

    await fs.writeFile(targetPath, fallbackContent, 'utf8')
  }

  return true
}

function installContextMenu() {
  const menuScriptPath = path.join(process.resourcesPath, 'scripts', 'macos-menu.sh')

  return new Promise((resolve, reject) => {
    const child = spawn(menuScriptPath, ['install', APP_SUPPORT_DIRECTORY], {
      env: {
        ...process.env,
        SYNC_WITH_RCLONE_CONFIG_DIR: CONFIG_DIRECTORY,
        SYNC_WITH_RCLONE_CONFIG_PATH: path.join(CONFIG_DIRECTORY, 'config.json'),
        SYNC_WITH_RCLONE_EXECUTABLE: process.execPath,
        SYNC_WITH_RCLONE_LOG_DIR: LOG_DIRECTORY,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', chunk => (stdout += chunk))
    child.stderr.on('data', chunk => (stderr += chunk))
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }

      reject(new Error(stderr.trim() || stdout.trim() || `macos-menu.sh exited with code ${code}`))
    })
  })
}

async function readContextMenuState() {
  try {
    const rawContent = await fs.readFile(CONTEXT_MENU_STATE_PATH, 'utf8')
    return JSON.parse(rawContent)
  }
  catch {
    return null
  }
}

async function writeContextMenuState(state) {
  await ensureDirectory(path.dirname(CONTEXT_MENU_STATE_PATH))
  await fs.writeFile(CONTEXT_MENU_STATE_PATH, JSON.stringify(state, null, 2), 'utf8')
}

async function shouldInstallContextMenu(version) {
  const currentState = {
    executablePath: process.execPath,
    version: version || '',
  }
  const previousState = await readContextMenuState()

  return JSON.stringify(previousState) !== JSON.stringify(currentState)
}

async function markContextMenuInstalled(version) {
  await writeContextMenuState({
    executablePath: process.execPath,
    version: version || '',
  })
}

async function ensureMacAppSupport(version) {
  await ensureDirectory(CONFIG_DIRECTORY)
  await ensureDirectory(LOG_DIRECTORY)

  const configCreated = await ensureFile(
    path.join(CONFIG_DIRECTORY, 'config.json'),
    getTemplatePath('config.json.mac.example'),
    `${JSON.stringify({
      globalIgnorePatterns: ['.DS_Store', 'Thumbs.db'],
      excludeFromFiles: ['.gitignore', '.rcloneignore'],
      syncJobs: [],
    }, null, 2)}\n`,
  )

  const rcloneTemplateCreated = await ensureFile(
    path.join(CONFIG_DIRECTORY, 'rclone.conf'),
    getTemplatePath('rclone.conf.mac.example'),
    '[example]\ntype = local\nnounc = true\n',
  )

  let contextMenuInstalled = false
  if (await shouldInstallContextMenu(version)) {
    await installContextMenu()
    await markContextMenuInstalled(version)
    contextMenuInstalled = true
  }

  return {
    appSupportDirectory: APP_SUPPORT_DIRECTORY,
    configDirectory: CONFIG_DIRECTORY,
    configPath: path.join(CONFIG_DIRECTORY, 'config.json'),
    configCreated,
    contextMenuInstalled,
    rcloneTemplateCreated,
  }
}

module.exports = {
  ensureMacAppSupport,
}
