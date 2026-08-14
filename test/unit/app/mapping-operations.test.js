import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { APP_ERROR_CODE, AppError } from '#src/app/app-errors.js'
import {
  MAPPING_DELETE_PROGRESS_STEP,
  MAPPING_SAVE_PROGRESS_STEP,
} from '#src/app/contracts/mapping.js'
import {
  createMapping,
  deleteMapping,
  updateMapping,
  updateMappingExclusionPatterns,
} from '#src/app/operations/mapping.js'
import {
  INFRASTRUCTURE_ERROR_CODE,
  InfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'
import { withFakeAppRuntime } from '#test/helpers/fake-runtime.js'

test('createMapping reports an invalid local directory and preserves its native cause', async () => {
  const missingPath = path.resolve('test/fixtures/path-does-not-exist')

  await assert.rejects(() => createMapping({
    rcloneRemote: 'synology',
    localBasePath: missingPath,
    remoteBasePath: 'Projects',
  }), (error) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.code, APP_ERROR_CODE.PATH_INVALID)
    assert.ok(error.cause instanceof InfrastructureError)
    assert.equal(error.cause.code, INFRASTRUCTURE_ERROR_CODE.PATH_NOT_FOUND)
    assert.equal(error.cause.cause.code, 'ENOENT')
    assert.deepEqual(error.meta, {
      path: missingPath.replaceAll(path.sep, path.posix.sep),
    })
    return true
  })
})

test('deleteMapping removes the selected mapping and preserves global exclusion patterns', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalExclusionPatterns: ['.DS_Store'],
      mappings: [
        {
          displayName: 'A',
          rcloneRemote: 'synology',
          localBasePath: '/local/a',
          remoteBasePath: 'A',
          exclusionPatterns: [],
        },
        {
          displayName: 'B',
          rcloneRemote: 'synology',
          localBasePath: '/local/b',
          remoteBasePath: 'B',
          exclusionPatterns: ['node_modules/'],
        },
      ],
    },
  }, async ({ configPath }) => {
    const progress = []
    const deletedMapping = await deleteMapping({
      rcloneRemote: 'synology',
      localBasePath: path.resolve('/local/a'),
    }, step => progress.push(step))

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.equal(deletedMapping.displayName, 'A')
    assert.equal(deletedMapping.localBasePath, path.resolve('/local/a'))
    assert.deepEqual(saved.globalExclusionPatterns, ['.DS_Store'])
    assert.deepEqual(saved.mappings.map(mapping => mapping.displayName), ['B'])
    assert.deepEqual(saved.mappings[0].exclusionPatterns, ['node_modules/'])
    assert.deepEqual(progress, [MAPPING_DELETE_PROGRESS_STEP.DELETE])
  })
})

test('deleteMapping returns an error when the mapping does not exist', async () => {
  await withFakeAppRuntime({
    appConfig: {
      mappings: [{
        displayName: 'A',
        rcloneRemote: 'synology',
        localBasePath: '/local/a',
        remoteBasePath: 'A',
        exclusionPatterns: [],
      }],
    },
  }, async () => {
    await assert.rejects(
      () => deleteMapping({
        rcloneRemote: 'synology',
        localBasePath: path.resolve('/local/missing'),
      }),
      error => error?.code === 'mapping.not_found',
    )
  })
})

test('createMapping saves a normalized mapping with default metadata', async () => {
  await withFakeAppRuntime({
    appConfig: { globalExclusionPatterns: ['.DS_Store'], mappings: [] },
  }, async ({ tempDir, configPath }) => {
    const localPath = path.join(tempDir, 'local')
    await fs.mkdir(localPath)

    const progress = []
    const result = await createMapping({
      rcloneRemote: ' synology ',
      localBasePath: localPath,
      remoteBasePath: 'Projects\\Current/',
    }, step => progress.push(step))

    assert.equal(result.rcloneRemote, 'synology')
    assert.equal(result.remoteBasePath, 'Projects/Current')
    assert.deepEqual(result.exclusionPatterns, [])
    assert.equal(result.lastSyncDate, null)

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.globalExclusionPatterns, ['.DS_Store'])
    assert.equal(saved.mappings[0].localBasePath, await fs.realpath(localPath))
    assert.deepEqual(progress, [MAPPING_SAVE_PROGRESS_STEP.SAVE])
  })
})

test('createMapping stores the real directory behind a linked mapping root', async (t) => {
  await withFakeAppRuntime({
    appConfig: { globalExclusionPatterns: [], mappings: [] },
  }, async ({ tempDir }) => {
    const realPath = path.join(tempDir, 'real-local')
    const linkPath = path.join(tempDir, 'linked-local')
    await fs.mkdir(realPath)
    try {
      await fs.symlink(realPath, linkPath, 'dir')
    }
    catch (error) {
      if (error?.code === 'EPERM') {
        t.skip('Creating symbolic links requires additional privileges on this platform.')
        return
      }
      throw error
    }

    const result = await createMapping({
      rcloneRemote: 'synology',
      localBasePath: linkPath,
      remoteBasePath: 'Projects',
    })

    assert.equal(result.localBasePath, await fs.realpath(realPath))
  })
})

test('updateMapping changes the mapping and preserves mapping metadata', async () => {
  await withFakeAppRuntime({
    appConfig: {
      globalExclusionPatterns: [],
      mappings: [{
        displayName: 'Project',
        rcloneRemote: 'synology',
        localBasePath: '/local/current',
        remoteBasePath: 'Current',
        exclusionPatterns: ['node_modules/'],
        lastSyncMode: 'push',
        lastSyncFolder: 'src',
        lastSyncDate: '2026-07-17',
      }],
    },
  }, async ({ tempDir }) => {
    const nextPath = path.join(tempDir, 'next')
    await fs.mkdir(nextPath)

    const result = await updateMapping({
      rcloneRemote: 'synology',
      localBasePath: path.resolve('/local/current'),
    }, {
      rcloneRemote: 'synology',
      localBasePath: nextPath,
      remoteBasePath: 'Next',
    })

    assert.equal(result.displayName, 'Project')
    assert.deepEqual(result.exclusionPatterns, ['node_modules/'])
    assert.equal(result.lastSyncMode, 'push')
    assert.equal(result.localBasePath, await fs.realpath(nextPath))
    assert.equal(result.remoteBasePath, 'Next')
  })
})

test('updateMappingExclusionPatterns changes patterns and preserves global patterns and mapping metadata', async () => {
  const localPath = process.cwd()
  await withFakeAppRuntime({
    appConfig: {
      globalExclusionPatterns: ['.DS_Store'],
      mappings: [{
        displayName: 'Project',
        rcloneRemote: 'synology',
        localBasePath: localPath,
        remoteBasePath: 'Current',
        exclusionPatterns: ['old-pattern'],
        lastSyncMode: 'pull',
        lastSyncFolder: 'src',
        lastSyncDate: '2026-07-20',
      }],
    },
  }, async ({ configPath }) => {
    const result = await updateMappingExclusionPatterns({
      rcloneRemote: 'synology',
      localBasePath: localPath,
    }, ['node_modules/', '*.tmp', '*.tmp'])

    assert.deepEqual(result.exclusionPatterns, ['node_modules/', '*.tmp', '*.tmp'])
    assert.equal(result.displayName, 'Project')
    assert.equal(result.lastSyncMode, 'pull')

    const saved = JSON.parse(await fs.readFile(configPath, 'utf8'))
    assert.deepEqual(saved.globalExclusionPatterns, ['.DS_Store'])
    assert.deepEqual(saved.mappings[0].exclusionPatterns, ['node_modules/', '*.tmp', '*.tmp'])
    assert.equal(saved.mappings[0].lastSyncFolder, 'src')
    assert.equal(saved.mappings[0].lastSyncDate, '2026-07-20')
  })
})

test('updateMappingExclusionPatterns rejects non-string entries', async () => {
  await withFakeAppRuntime({
    appConfig: {
      mappings: [{
        rcloneRemote: 'synology',
        localBasePath: '/local/current',
        remoteBasePath: 'Current',
        exclusionPatterns: [],
      }],
    },
  }, async () => {
    await assert.rejects(() => updateMappingExclusionPatterns({
      rcloneRemote: 'synology',
      localBasePath: path.resolve('/local/current'),
    }, ['valid', 42]), error => error?.code === 'ipc.invalid_payload')
  })
})

test('updateMappingExclusionPatterns rejects negation rules', async () => {
  await withFakeAppRuntime({
    appConfig: {
      mappings: [{
        rcloneRemote: 'synology',
        localBasePath: '/local/current',
        remoteBasePath: 'Current',
        exclusionPatterns: [],
      }],
    },
  }, async () => {
    await assert.rejects(() => updateMappingExclusionPatterns({
      rcloneRemote: 'synology',
      localBasePath: path.resolve('/local/current'),
    }, ['!keep.txt']), error => error?.code === 'ipc.invalid_payload' && /negation/.test(error.message))
  })
})

test('updateMapping rejects a conflicting server and local folder pair', async () => {
  const localA = process.cwd()
  const localB = path.dirname(localA)
  await withFakeAppRuntime({
    appConfig: {
      mappings: [
        { rcloneRemote: 'synology', localBasePath: localA, remoteBasePath: 'A' },
        { rcloneRemote: 'synology', localBasePath: localB, remoteBasePath: 'B' },
      ],
    },
  }, async () => {
    await assert.rejects(() => updateMapping({
      rcloneRemote: 'synology',
      localBasePath: localA,
    }, {
      rcloneRemote: 'synology',
      localBasePath: localB,
      remoteBasePath: 'Other',
    }), error => error?.code === 'mapping.already_exists')
  })
})
