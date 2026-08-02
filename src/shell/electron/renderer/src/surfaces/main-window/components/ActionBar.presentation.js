export const MAIN_WINDOW_ACTION = Object.freeze({
  CREATE_TASK: 'createTask',
  EDIT_SERVER: 'editServer',
  DELETE_SERVER: 'deleteServer',
  EDIT_FOLDER_MAPPING: 'editFolderMapping',
  DELETE_TASK: 'deleteTask',
  EDIT_PATTERNS: 'editPatterns',
})

export const ACTION_BAR_PRIMARY_ACTION = Object.freeze({
  name: 'create',
  action: MAIN_WINDOW_ACTION.CREATE_TASK,
})

export const ACTION_BAR_SERVER_ACTIONS = Object.freeze([
  { name: 'edit', action: MAIN_WINDOW_ACTION.EDIT_SERVER },
  { name: 'delete', action: MAIN_WINDOW_ACTION.DELETE_SERVER },
])

export const ACTION_BAR_TASK_ACTIONS = Object.freeze([
  { name: 'edit', action: MAIN_WINDOW_ACTION.EDIT_FOLDER_MAPPING },
  { name: 'delete', action: MAIN_WINDOW_ACTION.DELETE_TASK },
  { name: 'editPatterns', action: MAIN_WINDOW_ACTION.EDIT_PATTERNS },
])
