export const FORM_MODAL_VIEW = {
  CHOOSE_SERVER: 'chooseServer',
  CREATE_SERVER: 'createServer',
  CREATE_FOLDER_MAPPING: 'createFolderMapping',
  EDIT_SERVER: 'editServer',
  EDIT_FOLDER_MAPPING: 'editFolderMapping',
  EDIT_PATTERNS: 'editPatterns',
}

const VALID_FORM_MODAL_VIEWS = new Set(Object.values(FORM_MODAL_VIEW))

export function isValidFormModalView(view) {
  return VALID_FORM_MODAL_VIEWS.has(view)
}
