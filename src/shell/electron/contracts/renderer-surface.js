export const RENDERER_SURFACE = Object.freeze({
  MAIN_WINDOW: 'main-window',
  MESSAGE_BOX: 'message-box',
  FOLDER_DIALOG: 'folder-dialog',
  SYNC_SESSION: 'sync-session',
  FORM_MODAL: 'form-modal',
})

const VALID_RENDERER_SURFACES = new Set(Object.values(RENDERER_SURFACE))

export function isValidRendererSurface(surface) {
  return VALID_RENDERER_SURFACES.has(surface)
}
