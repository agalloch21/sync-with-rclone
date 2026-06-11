export const SYNC_TASK_MODALS = {
  CHOOSE_SERVER: 'chooseServer',
  CREATE_SERVER: 'createServer',
  CREATE_FOLDER_MAPPING: 'createFolderMapping',
  EDIT_SERVER: 'editServer',
  EDIT_FOLDER_MAPPING: 'editFolderMapping',
  EDIT_PATTERNS: 'editPatterns',
  CONFIRM_DELETE_SERVER: 'confirmDeleteServer',
  CONFIRM_DELETE_TASK: 'confirmDeleteTask',
}

const VALID_SYNC_TASK_MODALS = new Set(Object.values(SYNC_TASK_MODALS))

export function isValidSyncTaskModal(modalName) {
  return VALID_SYNC_TASK_MODALS.has(modalName)
}
