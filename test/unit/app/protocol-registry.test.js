import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createDefaultProtocolForm,
  createProtocolFormForSwitch,
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

test('createProtocolFormFromRemote returns an empty form for unsupported protocols', () => {
  assert.deepEqual(createProtocolFormFromRemote('alias', {
    name: 'local-alias',
    type: 'alias',
    remote: '/tmp/source',
  }), {})
})

test('createProtocolFormForSwitch preserves shared fields and applies target protocol defaults', () => {
  assert.deepEqual(createProtocolFormForSwitch('ftp', {
    name: 'synology',
    host: 'nas.local',
    port: 22,
    user: 'xiaobo',
    pass: '',
  }), {
    name: 'synology',
    host: 'nas.local',
    port: 21,
    user: 'xiaobo',
    pass: '',
  })

  assert.deepEqual(createProtocolFormForSwitch('sftp', {
    name: 'synology',
    host: 'nas.local',
    port: '',
    user: 'xiaobo',
    pass: '',
  }), {
    name: 'synology',
    host: 'nas.local',
    port: 22,
    user: 'xiaobo',
    pass: '',
  })
})

test('createProtocolFormForSwitch returns an empty form for unsupported protocols', () => {
  assert.deepEqual(createProtocolFormForSwitch('alias', {
    name: 'local-alias',
  }), {})
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
