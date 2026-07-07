import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProtocolForm,
  getDefaultProtocolType,
  getProtocolDefinition,
  REMOTE_PROTOCOLS,
  validateProtocolForm,
} from '#src/app/configuration/protocol-registry.js'

test('protocol registry exposes ftp and sftp definitions', () => {
  assert.deepEqual(REMOTE_PROTOCOLS.map(protocol => protocol.type), ['sftp', 'ftp'])
  assert.equal(getDefaultProtocolType(), 'sftp')
  assert.equal(getProtocolDefinition('ftp').label, 'FTP')
})

test('createDefaultProtocolForm uses protocol defaults', () => {
  assert.deepEqual(createDefaultProtocolForm('sftp'), {
    host: null,
    port: 22,
    user: null,
    pass: null,
  })
  assert.deepEqual(createDefaultProtocolForm('ftp'), {
    host: null,
    port: 21,
    user: null,
    pass: null,
  })
})

test('validateProtocolForm returns field errors', () => {
  assert.deepEqual(validateProtocolForm('sftp', {
    host: '',
    port: '0',
    user: '',
    pass: '',
  }), {
    success: false,
    error: {
      message: 'Validation failed.',
      fields: {
        host: 'Host is required.',
        port: 'Port must be a positive number.',
        user: 'Username is required.',
        pass: 'Password is required.',
      },
    },
  })
})

test('validateProtocolForm accepts valid protocol fields', () => {
  assert.deepEqual(validateProtocolForm('sftp', {
    host: 'nas.local',
    port: '22',
    user: 'xiaobo',
    pass: 'secret',
  }), { success: true })
})
