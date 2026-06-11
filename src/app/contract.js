export const MAIN_ACTIONS = {
  CHOOSE_SERVER: 'chooseServer',
  CREATE_SERVER: 'createServer',
  EDIT_SERVER: 'editServer',
  DELETE_SERVER: 'deleteServer',

  CREATE_TASK: 'createTask',
  EDIT_TASK: 'editTask',
  DELETE_TASK: 'deleteTask',
  EDIT_PATTERNS: 'editPatterns',
}
const VALID_MAIN_ACTIONS = new Set(Object.values(MAIN_ACTIONS))

export function isValidAction(action) {
  return VALID_MAIN_ACTIONS.has(action)
}
