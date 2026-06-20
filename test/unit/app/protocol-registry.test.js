import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProtocolForm,
  createProtocolFormFromRemote,
  getDefaultProtocolType,
  getProtocolDefinition,
  REMOTE_PROTOCOLS,
  validateProtocolForm,
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

test('createProtocolFormFromRemote uses flat remote fields and blanks passwords', () => {
  assert.deepEqual(createProtocolFormFromRemote('sftp', {
    name: 'synology',
    type: 'sftp',
    host: 'nas.local',
    port: 2222,
    user: 'xiaobo',
    pass: 'obscured-pass',
  }), {
    name: 'synology',
    host: 'nas.local',
    port: 2222,
    user: 'xiaobo',
    pass: '',
  })
})

test('validateProtocolForm returns field errors', () => {
  assert.deepEqual(validateProtocolForm('sftp', {
    name: '',
    host: '',
    port: '0',
    user: '',
    pass: '',
  }), {
    name: 'Name is required.',
    host: 'Host is required.',
    port: 'Port must be a positive number.',
    user: 'Username is required.',
    pass: 'Password is required.',
  })
})
