export async function runMainPanel() {
  // DMG first-launch setup used to run here when no localFolderPath was passed.
  // PKG install now owns setup/config bootstrap, so normal launches go straight
  // into the routed Electron entry. Re-enable macos-dmg-initialization.cjs only if DMG
  // first-launch support returns.
  // if (await initializeMacSetupIfNeeded(app, dialog, shell, options.localFolderPath))
  // return

  const { createMainWindow } = await import('./main-window.js')
  return createMainWindow()
}
