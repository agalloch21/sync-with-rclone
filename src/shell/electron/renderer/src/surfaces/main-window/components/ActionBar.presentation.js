export const MAIN_WINDOW_ACTION = Object.freeze({
  CREATE_MAPPING: 'createMapping',
  EDIT_SERVER: 'editServer',
  DELETE_SERVER: 'deleteServer',
  EDIT_FOLDER_MAPPING: 'editFolderMapping',
  DELETE_MAPPING: 'deleteMapping',
  EDIT_PATTERNS: 'editPatterns',
})

export const ACTION_BAR_PRIMARY_ACTION = Object.freeze({
  name: 'create',
  action: MAIN_WINDOW_ACTION.CREATE_MAPPING,
})

export const ACTION_BAR_SERVER_ACTIONS = Object.freeze([
  { name: 'edit', action: MAIN_WINDOW_ACTION.EDIT_SERVER },
  { name: 'delete', action: MAIN_WINDOW_ACTION.DELETE_SERVER },
])

export const ACTION_BAR_MAPPING_ACTIONS = Object.freeze([
  { name: 'edit', action: MAIN_WINDOW_ACTION.EDIT_FOLDER_MAPPING },
  { name: 'delete', action: MAIN_WINDOW_ACTION.DELETE_MAPPING },
  { name: 'editPatterns', action: MAIN_WINDOW_ACTION.EDIT_PATTERNS },
])
