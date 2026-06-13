const { spawn } = require('node:child_process')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const APP_SUPPORT_DIRECTORY = path.join(os.homedir(), 'Library', 'Application Support', 'sync-with-rclone')
const CONFIG_DIRECTORY = path.join(APP_SUPPORT_DIRECTORY, 'config')
const LOG_DIRECTORY = path.join(APP_SUPPORT_DIRECTORY, 'logs')
const CONTEXT_MENU_STATE_PATH = path.join(APP_SUPPORT_DIRECTORY, 'context-menu-state.json')
const SERVICES_DIRECTORY = path.join(os.homedir(), 'Library', 'Services')
const EXPECTED_WORKFLOWS = [
  'Sync with Rclone - 1 Push.workflow',
  'Sync with Rclone - 2 Pull.workflow',
  'Sync with Rclone - 3 Open Config.workflow',
]

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

async function hasInstalledContextMenuWorkflows() {
  try {
    await Promise.all(
      EXPECTED_WORKFLOWS.map(async (workflowName) => {
        await fs.access(path.join(SERVICES_DIRECTORY, workflowName))
      }),
    )
    return true
  }
  catch {
    return false
  }
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
      syncTasks: [],
    }, null, 2)}\n`,
  )

  const rcloneTemplateCreated = await ensureFile(
    path.join(CONFIG_DIRECTORY, 'rclone.conf'),
    getTemplatePath('rclone.conf.mac.example'),
    '[example]\ntype = local\nnounc = true\n',
  )

  let contextMenuInstalled = false
  const shouldRefreshContextMenu = await shouldInstallContextMenu(version)
  if (shouldRefreshContextMenu) {
    await installContextMenu()
    await markContextMenuInstalled(version)
    contextMenuInstalled = true
  }

  const contextMenuAlreadyInstalled = contextMenuInstalled || await hasInstalledContextMenuWorkflows()
  const hasSetupChanges = configCreated || rcloneTemplateCreated || contextMenuInstalled
  const shouldShowSetupDialog = configCreated

  return {
    appSupportDirectory: APP_SUPPORT_DIRECTORY,
    configDirectory: CONFIG_DIRECTORY,
    configPath: path.join(CONFIG_DIRECTORY, 'config.json'),
    configCreated,
    contextMenuAlreadyInstalled,
    contextMenuInstalled,
    hasSetupChanges,
    rcloneTemplateCreated,
    shouldShowSetupDialog,
  }
}

function shouldInitializeMacSetup(app, localFolderPath) {
  return process.platform === 'darwin' && app.isPackaged && !localFolderPath
}

async function initializeMacSetupIfNeeded(app, dialog, shell, localFolderPath) {
  if (!shouldInitializeMacSetup(app, localFolderPath))
    return false

  const setup = await ensureMacAppSupport(app.getVersion())

  if (!setup.hasSetupChanges || !setup.shouldShowSetupDialog) {
    app.quit()
    return true
  }

  const detail = [
    `Config: ${setup.configPath}`,
    `Quick Actions: ${setup.contextMenuInstalled ? 'installed or refreshed' : setup.contextMenuAlreadyInstalled ? 'already available' : 'not installed'}`,
    setup.configCreated ? 'Created config.json from template.' : 'Reused existing config.json.',
    setup.rcloneTemplateCreated ? 'Created rclone.conf template.' : 'Reused existing rclone.conf.',
  ].join('\n')

  const { response } = await dialog.showMessageBox({
    type: 'info',
    title: 'sync-with-rclone',
    message: 'macOS setup is ready',
    detail,
    buttons: ['Open Config', 'Close'],
    defaultId: 0,
    cancelId: 1,
  })

  if (response === 0)
    await shell.openPath(setup.configPath)

  app.quit()
  return true
}

module.exports = {
  initializeMacSetupIfNeeded,
}
