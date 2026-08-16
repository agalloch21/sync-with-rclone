import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test, { after, before } from 'node:test'
import { APP_ERROR_CODE } from '#src/app/app-errors.js'
import { resolveMapping } from '#src/app/operations/sync/resolve-mapping.js'

let temporaryPath
let projectRoot
let projectPath
let outsidePath

before(async () => {
  temporaryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'resolve-mapping-'))
  const nativeProjectRoot = path.join(temporaryPath, 'local')
  const nativeProjectPath = path.join(nativeProjectRoot, 'compare-push')
  const nativeOutsidePath = path.join(temporaryPath, 'outside')
  await fs.mkdir(nativeProjectPath, { recursive: true })
  await fs.mkdir(nativeOutsidePath)
  projectRoot = (await fs.realpath(nativeProjectRoot)).replaceAll(path.sep, path.posix.sep)
  projectPath = (await fs.realpath(nativeProjectPath)).replaceAll(path.sep, path.posix.sep)
  outsidePath = (await fs.realpath(nativeOutsidePath)).replaceAll(path.sep, path.posix.sep)
})

after(() => fs.rm(temporaryPath, { recursive: true, force: true }))

function createConfig(mappingOverrides = {}) {
  return {
    globalExclusionPatterns: ['.DS_Store'],
    mappings: [
      {
        displayName: 'ProjectsSynced',
        rcloneRemote: 'synology',
        localBasePath: projectRoot,
        remoteBasePath: 'ProjectsSynced',
        exclusionPatterns: ['node_modules/'],
        ...mappingOverrides,
      },
    ],
  }
}

test('resolveMapping matches the correct mapping and computes the default remote path', () => {
  const config = createConfig()
  const result = resolveMapping(config, projectPath)

  assert.equal(result.matchedMapping.displayName, 'ProjectsSynced')
  assert.equal(result.localFolderPath, projectPath)
  assert.equal(result.relativePath, 'compare-push')
  assert.equal(result.remoteFolderPath, 'synology:ProjectsSynced/compare-push')
  assert.deepEqual(result.exclusionPatterns, ['.DS_Store', 'node_modules/'])
})

test('resolveMapping allows explicit remote paths inside the same mapping', () => {
  const config = createConfig()
  const result = resolveMapping(
    config,
    projectPath,
    'synology:ProjectsSynced/custom-target',
  )

  assert.equal(result.remoteFolderPath, 'synology:ProjectsSynced/custom-target')
})

test('resolveMapping rejects explicit remote paths outside the current mapping', () => {
  const config = createConfig()

  assert.throws(() => resolveMapping(
    config,
    projectPath,
    'synology:AnotherRoot/custom-target',
  ), {
    name: 'AppError',
    code: APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_MAPPING,
  })
})

test('resolveMapping throws when no mapping matches the local path', () => {
  const config = createConfig()

  assert.throws(() => resolveMapping(config, outsidePath), {
    name: 'AppError',
    code: APP_ERROR_CODE.CONFIG_NO_MATCHING_MAPPING,
  })
})

test('resolveMapping allows syncing to the remote root when remoteBasePath is empty', () => {
  const config = {
    globalExclusionPatterns: [],
    mappings: [
      {
        displayName: 'ProjectsSynced',
        rcloneRemote: 'synology',
        localBasePath: projectPath,
        remoteBasePath: '',
        exclusionPatterns: [],
      },
    ],
  }

  const result = resolveMapping(config, projectPath)

  assert.equal(result.relativePath, '.')
  assert.equal(result.remoteFolderPath, 'synology:')
})

test('resolveMapping allows an explicit descendant of the remote root', () => {
  const config = createConfig({ remoteBasePath: '' })
  const result = resolveMapping(config, projectRoot, 'synology:subfolder')

  assert.equal(result.remoteFolderPath, 'synology:subfolder')
})

test('resolveMapping rejects normalized traversal outside the remote root', () => {
  const config = createConfig({ remoteBasePath: 'Projects/App' })

  assert.throws(
    () => resolveMapping(config, projectRoot, 'synology:Projects/App/../../outside'),
    error => error.code === APP_ERROR_CODE.CONFIG_REMOTE_PATH_OUTSIDE_MAPPING,
  )
})

test('resolveMapping uses a selected link logical path for mapping and its real path for execution', async (t) => {
  const temporaryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'resolve-mapping-link-'))
  const projectPath = path.join(temporaryPath, 'project')
  const externalAssetsPath = path.join(temporaryPath, 'external-assets')
  const linkedAssetsPath = path.join(projectPath, 'assets')

  try {
    await fs.mkdir(projectPath)
    await fs.mkdir(externalAssetsPath)
    try {
      await fs.symlink(externalAssetsPath, linkedAssetsPath, 'dir')
    }
    catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('Creating symbolic links requires additional privileges on this platform.')
        return
      }
      throw error
    }

    const result = resolveMapping(createConfig({
      localBasePath: projectPath,
      remoteBasePath: 'Projects',
    }), linkedAssetsPath)

    assert.equal(result.relativePath, 'assets')
    assert.equal(result.localFolderPath, await fs.realpath(externalAssetsPath))
    assert.equal(result.remoteFolderPath, 'synology:Projects/assets')
  }
  finally {
    await fs.rm(temporaryPath, { recursive: true, force: true })
  }
})
