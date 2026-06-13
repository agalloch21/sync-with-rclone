import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProtocolForm,
  createRemotePayload,
  getDefaultProtocolType,
  getProtocolDefinition,
  normalizeProtocolForm,
  REMOTE_PROTOCOLS,
} from '#src/app/sync-task/protocol-registry.js'

test('protocol registry exposes ftp and sftp definitions', () => {
  assert.deepEqual(REMOTE_PROTOCOLS.map(protocol => protocol.type), ['sftp', 'ftp'])
  assert.equal(getDefaultProtocolType(), 'sftp')
  assert.equal(getProtocolDefinition('ftp').label, 'FTP')
})

test('createDefaultProtocolForm uses protocol defaults', () => {
  assert.deepEqual(createDefaultProtocolForm('sftp'), {
    name: '',
    host: '',
    port: 22,
    user: '',
    pass: '',
  })
  assert.deepEqual(createDefaultProtocolForm('ftp'), {
    name: '',
    host: '',
    port: 21,
    user: '',
    pass: '',
  })
})

test('normalizeProtocolForm validates required fields and positive ports', () => {
  assert.deepEqual(normalizeProtocolForm('sftp', {
    name: '',
    host: '',
    port: '0',
    user: '',
    pass: '',
  }), {
    success: false,
    errors: {
      name: 'Name is required.',
      host: 'Host is required.',
      port: 'Port must be a positive number.',
      user: 'Username is required.',
      pass: 'Password is required.',
    },
  })
})

test('createRemotePayload trims text and parses numeric fields', () => {
  assert.deepEqual(createRemotePayload('sftp', {
    name: ' synology ',
    host: ' nas.local ',
    port: '2222',
    user: ' xiaobo ',
    pass: ' secret ',
  }), {
    success: true,
    value: {
      name: 'synology',
      type: 'sftp',
      options: {
        host: 'nas.local',
        port: 2222,
        user: 'xiaobo',
        pass: 'secret',
      },
    },
  })
})
