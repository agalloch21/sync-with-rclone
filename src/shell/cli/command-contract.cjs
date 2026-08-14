const CLI_COMMAND = Object.freeze({
  SYNC: 'sync',
  LIST_SERVERS: 'list-servers',
  GET_SERVER: 'get-server',
  LIST_SERVER_FOLDERS: 'list-server-folders',
  TEST_SERVER: 'test-server',
  CREATE_SERVER: 'create-server',
  UPDATE_SERVER: 'update-server',
  DELETE_SERVER: 'delete-server',
  LIST_MAPPINGS: 'list-mappings',
  CREATE_MAPPING: 'create-mapping',
  UPDATE_MAPPING: 'update-mapping',
  UPDATE_MAPPING_FILTER_PATTERNS: 'update-mapping-filter-patterns',
  DELETE_MAPPING: 'delete-mapping',
  LIST_GLOBAL_FILTER_PATTERNS: 'list-global-filter-patterns',
  UPDATE_GLOBAL_FILTER_PATTERNS: 'update-global-filter-patterns',
})

const CLI_COMMAND_NAMES = Object.freeze(Object.values(CLI_COMMAND))

module.exports = {
  CLI_COMMAND,
  CLI_COMMAND_NAMES,
}
