!macro WriteInstallLog MESSAGE
  FileOpen $9 "$TEMP\sync-with-rclone-installer.log" a
  FileWrite $9 "${MESSAGE}$\r$\n"
  FileClose $9
!macroend

!macro WriteUninstallLog MESSAGE
  FileOpen $9 "$TEMP\sync-with-rclone-uninstaller.log" a
  FileWrite $9 "${MESSAGE}$\r$\n"
  FileClose $9
!macroend

!macro WriteBothLogs MESSAGE
  !insertmacro WriteInstallLog "${MESSAGE}"
  !insertmacro WriteUninstallLog "${MESSAGE}"
!macroend

!define WIN_HELPER_SCRIPT_PATH "$INSTDIR\\resources\\scripts\\windows-installer.ps1"
!define WIN_APP_EXE "$INSTDIR\\sync-with-rclone.exe"
!define WIN_APP_DATA_DIR "$APPDATA\\sync-with-rclone"
!define WIN_POWERSHELL_EXE "$SYSDIR\\WindowsPowerShell\\v1.0\\powershell.exe"

!macro customInit
  !define INSTALL_REG_KEY "HKCU\\${INSTALL_REGISTRY_KEY}"
  !define UNINSTALL_REG_KEY "HKCU\\${UNINSTALL_REGISTRY_KEY}"
  Delete "$TEMP\sync-with-rclone-installer.log"
  Delete "$TEMP\sync-with-rclone-helper-install.log"
  !insertmacro WriteInstallLog "customInit: begin"
  !insertmacro WriteInstallLog "customInit: INSTDIR=$INSTDIR"
  !insertmacro WriteInstallLog "customInit: APPDATA=$APPDATA"

  IfFileExists "${WIN_HELPER_SCRIPT_PATH}" 0 custom_init_done
  IfFileExists "$INSTDIR\\*" 0 custom_init_done
    !insertmacro WriteInstallLog "customInit: preparing upgrade"
    nsExec::Exec `"${WIN_POWERSHELL_EXE}" -NoProfile -ExecutionPolicy Bypass -Command "& '${WIN_HELPER_SCRIPT_PATH}' -Action prepare-upgrade -InstallDir '$INSTDIR' -AppDataDir '${WIN_APP_DATA_DIR}' -ExecutablePath '${WIN_APP_EXE}' -ResourcesDir '$INSTDIR\resources' -InstallRegistryKey '${INSTALL_REG_KEY}' -UninstallRegistryKey '${UNINSTALL_REG_KEY}' *>> '$TEMP\sync-with-rclone-helper-install.log'; exit $$LASTEXITCODE"`
    Pop $R0
    !insertmacro WriteInstallLog "customInit: prepare-upgrade return code=$R0"

custom_init_done:
!macroend

!macro customUnInit
  Delete "$TEMP\sync-with-rclone-uninstaller.log"
  Delete "$TEMP\sync-with-rclone-helper-uninstall.log"
  !insertmacro WriteUninstallLog "customUnInit: begin"
  !insertmacro WriteUninstallLog "customUnInit: INSTDIR=$INSTDIR"
  !insertmacro WriteUninstallLog "customUnInit: APPDATA=$APPDATA"
!macroend

!macro customCheckAppRunning
  !insertmacro WriteBothLogs "customCheckAppRunning: begin"
  !insertmacro WriteBothLogs "customCheckAppRunning: INSTDIR=$INSTDIR"

  nsExec::Exec `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "$$appPath = [System.IO.Path]::GetFullPath('$INSTDIR\${APP_EXECUTABLE_FILENAME}'); $$matches = @(Get-CimInstance -ClassName Win32_Process | Where-Object { $$_.Path -and [System.String]::Equals($$_.Path, $$appPath, [System.StringComparison]::OrdinalIgnoreCase) }); if ($$matches.Count -gt 0) { exit 0 } else { exit 1 }"`
  Pop $R0

  StrCmp $R0 0 process_detected process_not_detected

process_detected:
  !insertmacro WriteBothLogs "customCheckAppRunning: detected running process"
  MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK stop_app
  Quit

stop_app:
  !insertmacro WriteBothLogs "customCheckAppRunning: attempting to stop running process"
  nsExec::Exec `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "$$appPath = [System.IO.Path]::GetFullPath('$INSTDIR\${APP_EXECUTABLE_FILENAME}'); Get-CimInstance -ClassName Win32_Process | Where-Object { $$_.Path -and [System.String]::Equals($$_.Path, $$appPath, [System.StringComparison]::OrdinalIgnoreCase) } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force }"`
  Pop $R1
  !insertmacro WriteBothLogs "customCheckAppRunning: stop return code=$R1"

  Sleep 1000

  nsExec::Exec `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "$$appPath = [System.IO.Path]::GetFullPath('$INSTDIR\${APP_EXECUTABLE_FILENAME}'); $$matches = @(Get-CimInstance -ClassName Win32_Process | Where-Object { $$_.Path -and [System.String]::Equals($$_.Path, $$appPath, [System.StringComparison]::OrdinalIgnoreCase) }); if ($$matches.Count -gt 0) { exit 0 } else { exit 1 }"`
  Pop $R0

  StrCmp $R0 0 still_running process_stopped

still_running:
  !insertmacro WriteBothLogs "customCheckAppRunning: process still detected after stop attempt"
  MessageBox MB_OK|MB_ICONEXCLAMATION "$(appCannotBeClosed)"
  Quit

process_stopped:
  !insertmacro WriteBothLogs "customCheckAppRunning: process stopped"
  Goto custom_check_done

process_not_detected:
  !insertmacro WriteBothLogs "customCheckAppRunning: no running process detected"

custom_check_done:
!macroend

!macro customInstall
  !insertmacro WriteInstallLog "customInstall: begin"
  !insertmacro WriteInstallLog "customInstall: script=${WIN_HELPER_SCRIPT_PATH}"

  IfFileExists "${WIN_HELPER_SCRIPT_PATH}" install_helper_run install_helper_missing

install_helper_missing:
  !insertmacro WriteInstallLog "customInstall: missing helper script"
  Abort "Missing Windows installer helper script: ${WIN_HELPER_SCRIPT_PATH}"

install_helper_run:
  nsExec::Exec `"${WIN_POWERSHELL_EXE}" -NoProfile -ExecutionPolicy Bypass -Command "& '${WIN_HELPER_SCRIPT_PATH}' -Action install -InstallDir '$INSTDIR' -AppDataDir '${WIN_APP_DATA_DIR}' -ExecutablePath '${WIN_APP_EXE}' -ResourcesDir '$INSTDIR\resources' *>> '$TEMP\sync-with-rclone-helper-install.log'; exit $$LASTEXITCODE"`
  Pop $R0
  !insertmacro WriteInstallLog "customInstall: helper return code=$R0"

  StrCmp $R0 0 install_helper_ok install_helper_failed

install_helper_failed:
  Abort "Windows install helper failed with exit code $R0"

install_helper_ok:
  !insertmacro WriteInstallLog "customInstall: completed"
!macroend

!macro customUnInstall
  !insertmacro WriteUninstallLog "customUnInstall: begin"
  IfFileExists "${WIN_HELPER_SCRIPT_PATH}" 0 uninstall_skip_script
    nsExec::Exec `"${WIN_POWERSHELL_EXE}" -NoProfile -ExecutionPolicy Bypass -Command "& '${WIN_HELPER_SCRIPT_PATH}' -Action unregister-menu -InstallDir '$INSTDIR' *>> '$TEMP\sync-with-rclone-helper-uninstall.log'; exit $$LASTEXITCODE"`
    Pop $R0
    !insertmacro WriteUninstallLog "customUnInstall: helper return code=$R0"
    Goto uninstall_done

uninstall_skip_script:
  !insertmacro WriteUninstallLog "customUnInstall: helper script missing, skipping menu cleanup"

uninstall_done:
  !insertmacro WriteUninstallLog "customUnInstall: completed"
!macroend

!macro customRemoveFiles
  !insertmacro WriteUninstallLog "customRemoveFiles: begin"
  IfFileExists "${WIN_HELPER_SCRIPT_PATH}" 0 remove_skip_script
    ${if} ${isUpdated}
      nsExec::Exec `"${WIN_POWERSHELL_EXE}" -NoProfile -ExecutionPolicy Bypass -Command "& '${WIN_HELPER_SCRIPT_PATH}' -Action remove-files -InstallDir '$INSTDIR' -UninstallerName '${UNINSTALL_FILENAME}' -Updated *>> '$TEMP\sync-with-rclone-helper-uninstall.log'; exit $$LASTEXITCODE"`
    ${else}
      nsExec::Exec `"${WIN_POWERSHELL_EXE}" -NoProfile -ExecutionPolicy Bypass -Command "& '${WIN_HELPER_SCRIPT_PATH}' -Action remove-files -InstallDir '$INSTDIR' -UninstallerName '${UNINSTALL_FILENAME}' *>> '$TEMP\sync-with-rclone-helper-uninstall.log'; exit $$LASTEXITCODE"`
    ${endif}
    Pop $R0
    !insertmacro WriteUninstallLog "customRemoveFiles: helper return code=$R0"
    StrCmp $R0 0 remove_continue remove_failed

remove_skip_script:
  !insertmacro WriteUninstallLog "customRemoveFiles: helper script missing, falling back to NSIS cleanup"
  Goto remove_continue

remove_failed:
  Abort "Windows uninstall helper failed with exit code $R0"

remove_continue:
  SetOutPath $TEMP
  !insertmacro WriteUninstallLog "customRemoveFiles: SetOutPath $TEMP"
  RMDir /r $INSTDIR
  IfErrors remove_rmdir_failed remove_rmdir_done

remove_rmdir_failed:
  !insertmacro WriteUninstallLog "customRemoveFiles: RMDir failed for $INSTDIR"

remove_rmdir_done:
  !insertmacro WriteUninstallLog "customRemoveFiles: completed"
!macroend
