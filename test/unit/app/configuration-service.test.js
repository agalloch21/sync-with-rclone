import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { APP_ERROR_CODE, AppError } from '#src/app/app-errors.js'
import { loadAppConfiguration, updateConfiguration } from '#src/app/services/app-config.js'
import {
  INFRASTRUCTURE_ERROR_CODE,
  InfrastructureError,
} from '#src/infrastructure/infrastructure-error.js'

test('loadAppConfiguration wraps config parsing failure and preserves its native cause', async () => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-config-load-error-'))
  const configPath = path.join(temporaryDirectory, 'config.json')
  await fs.writeFile(configPath, '{broken', 'utf8')

  await assert.rejects(() => loadAppConfiguration(configPath), (error) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.code, APP_ERROR_CODE.CONFIG_LOAD_FAILED)
    assert.ok(error.cause instanceof InfrastructureError)
    assert.equal(error.cause.code, INFRASTRUCTURE_ERROR_CODE.CONFIG_LOAD_FAILED)
    assert.ok(error.cause.cause instanceof SyntaxError)
    assert.deepEqual(error.meta, { configPath })
    return true
  })

  await fs.rm(temporaryDirectory, { recursive: true, force: true })
})

test('updateConfiguration wraps storage failure and preserves its native cause', async () => {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-config-update-error-'))
  const configDirectory = path.join(temporaryDirectory, 'missing')
  const configPath = path.join(configDirectory, 'config.json')

  await assert.rejects(() => updateConfiguration(() => ({
    globalFilterPatterns: [],
    mappings: [],
  }), { configDirectory, configPath }), (error) => {
    assert.ok(error instanceof AppError)
    assert.equal(error.code, APP_ERROR_CODE.CONFIG_UPDATE_FAILED)
    assert.ok(error.cause instanceof InfrastructureError)
    assert.equal(error.cause.code, INFRASTRUCTURE_ERROR_CODE.CONFIG_UPDATE_FAILED)
    assert.equal(error.cause.cause.code, 'ENOENT')
    assert.deepEqual(error.meta, { configPath })
    return true
  })

  await fs.rm(temporaryDirectory, { recursive: true, force: true })
})
