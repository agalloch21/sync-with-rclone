const CLI_COMMAND = Object.freeze({
  SYNC: 'sync',
  LIST_SERVERS: 'list-servers',
  GET_SERVER: 'get-server',
  LIST_SERVER_FOLDERS: 'list-server-folders',
  TEST_SERVER: 'test-server',
  CREATE_SERVER: 'create-server',
  UPDATE_SERVER: 'update-server',
  DELETE_SERVER: 'delete-server',
  LIST_TASKS: 'list-tasks',
  CREATE_TASK: 'create-task',
  UPDATE_TASK: 'update-task',
  UPDATE_TASK_IGNORE_PATTERNS: 'update-task-ignore-patterns',
  DELETE_TASK: 'delete-task',
  LIST_GLOBAL_IGNORE_PATTERNS: 'list-global-ignore-patterns',
  UPDATE_GLOBAL_IGNORE_PATTERNS: 'update-global-ignore-patterns',
})

const CLI_COMMAND_NAMES = Object.freeze(Object.values(CLI_COMMAND))

module.exports = {
  CLI_COMMAND,
  CLI_COMMAND_NAMES,
}
