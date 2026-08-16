import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export async function createTemporaryDirectory(t, prefix = 'sync-with-rclone-test-') {
  const directoryPath = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  t.after(() => fs.rm(directoryPath, { recursive: true, force: true }))
  return directoryPath
}

export async function writeFixtureFiles(rootPath, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(rootPath, ...relativePath.split('/'))
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content)
  }
}
