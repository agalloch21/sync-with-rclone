!macro customInstall
  !define APP_EXE "$INSTDIR\\sync-with-rclone.exe"
  !define APP_DATA_DIR "$APPDATA\\sync-with-rclone"
  !define CONFIG_PATH "${APP_DATA_DIR}\\config.json"
  !define RCLONE_CONFIG_PATH "${APP_DATA_DIR}\\rclone.conf"
  !define CONFIG_TEMPLATE "$INSTDIR\\resources\\templates\\config.json.win.example"
  !define RCLONE_CONFIG_TEMPLATE "$INSTDIR\\resources\\templates\\rclone.conf.win.example"

  CreateDirectory "${APP_DATA_DIR}"

  IfFileExists "${CONFIG_PATH}" +3 0
    CopyFiles /SILENT "${CONFIG_TEMPLATE}" "${APP_DATA_DIR}"
    Rename "${APP_DATA_DIR}\\config.json.win.example" "${CONFIG_PATH}"

  IfFileExists "${RCLONE_CONFIG_PATH}" +3 0
    CopyFiles /SILENT "${RCLONE_CONFIG_TEMPLATE}" "${APP_DATA_DIR}"
    Rename "${APP_DATA_DIR}\\rclone.conf.win.example" "${RCLONE_CONFIG_PATH}"

  WriteRegStr HKCU "Software\\Classes\\Directory\\shell\\sync-with-rclone.push" "" "Push"
  WriteRegStr HKCU "Software\\Classes\\Directory\\shell\\sync-with-rclone.push\\command" "" '"${APP_EXE}" push "%1"'

  WriteRegStr HKCU "Software\\Classes\\Directory\\shell\\sync-with-rclone.pull" "" "Pull"
  WriteRegStr HKCU "Software\\Classes\\Directory\\shell\\sync-with-rclone.pull\\command" "" '"${APP_EXE}" pull "%1"'

  WriteRegStr HKCU "Software\\Classes\\Directory\\Background\\shell\\sync-with-rclone.push" "" "Push"
  WriteRegStr HKCU "Software\\Classes\\Directory\\Background\\shell\\sync-with-rclone.push\\command" "" '"${APP_EXE}" push "%V"'

  WriteRegStr HKCU "Software\\Classes\\Directory\\Background\\shell\\sync-with-rclone.pull" "" "Pull"
  WriteRegStr HKCU "Software\\Classes\\Directory\\Background\\shell\\sync-with-rclone.pull\\command" "" '"${APP_EXE}" pull "%V"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\\Classes\\Directory\\shell\\sync-with-rclone.push"
  DeleteRegKey HKCU "Software\\Classes\\Directory\\shell\\sync-with-rclone.pull"
  DeleteRegKey HKCU "Software\\Classes\\Directory\\Background\\shell\\sync-with-rclone.push"
  DeleteRegKey HKCU "Software\\Classes\\Directory\\Background\\shell\\sync-with-rclone.pull"
!macroend
