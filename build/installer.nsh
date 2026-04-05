!define WIN_HELPER_SCRIPT_PATH "$INSTDIR\\resources\\scripts\\windows-installer.ps1"
!define WIN_APP_EXE "$INSTDIR\\sync-with-rclone.exe"
!define WIN_APP_DATA_DIR "$INSTDIR\\config"
!define WIN_POWERSHELL_EXE "$SYSDIR\\WindowsPowerShell\\v1.0\\powershell.exe"

!macro customInit
!macroend

!macro customUnInit
!macroend

!macro customCheckAppRunning
  nsExec::Exec `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "$$appPath = [System.IO.Path]::GetFullPath('$INSTDIR\${APP_EXECUTABLE_FILENAME}'); $$matches = @(Get-CimInstance -ClassName Win32_Process | Where-Object { $$_.Path -and [System.String]::Equals($$_.Path, $$appPath, [System.StringComparison]::OrdinalIgnoreCase) }); if ($$matches.Count -gt 0) { exit 0 } else { exit 1 }"`
  Pop $R0

  StrCmp $R0 0 process_detected process_not_detected

process_detected:
  MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK stop_app
  Quit

stop_app:
  nsExec::Exec `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "$$appPath = [System.IO.Path]::GetFullPath('$INSTDIR\${APP_EXECUTABLE_FILENAME}'); Get-CimInstance -ClassName Win32_Process | Where-Object { $$_.Path -and [System.String]::Equals($$_.Path, $$appPath, [System.StringComparison]::OrdinalIgnoreCase) } | ForEach-Object { Stop-Process -Id $$_.ProcessId -Force }"`
  Pop $R1

  Sleep 1000

  nsExec::Exec `"$PowerShellPath" -NoProfile -ExecutionPolicy Bypass -Command "$$appPath = [System.IO.Path]::GetFullPath('$INSTDIR\${APP_EXECUTABLE_FILENAME}'); $$matches = @(Get-CimInstance -ClassName Win32_Process | Where-Object { $$_.Path -and [System.String]::Equals($$_.Path, $$appPath, [System.StringComparison]::OrdinalIgnoreCase) }); if ($$matches.Count -gt 0) { exit 0 } else { exit 1 }"`
  Pop $R0

  StrCmp $R0 0 still_running process_stopped

still_running:
  MessageBox MB_OK|MB_ICONEXCLAMATION "$(appCannotBeClosed)"
  Quit

process_stopped:
  Goto custom_check_done

process_not_detected:

custom_check_done:
!macroend

!macro customInstall
  IfFileExists "${WIN_HELPER_SCRIPT_PATH}" install_helper_run install_helper_missing

install_helper_missing:
  Abort "Missing Windows installer helper script: ${WIN_HELPER_SCRIPT_PATH}"

install_helper_run:
  nsExec::Exec `"${WIN_POWERSHELL_EXE}" -NoProfile -ExecutionPolicy Bypass -Command "& '${WIN_HELPER_SCRIPT_PATH}' -Action install -InstallDir '$INSTDIR' -AppDataDir '${WIN_APP_DATA_DIR}' -ExecutablePath '${WIN_APP_EXE}' -ResourcesDir '$INSTDIR\resources'; exit $$LASTEXITCODE"`
  Pop $R0

  StrCmp $R0 0 install_helper_ok install_helper_failed

install_helper_failed:
  Abort "Windows install helper failed with exit code $R0"

install_helper_ok:
!macroend

!macro customUnInstall
  IfFileExists "${WIN_HELPER_SCRIPT_PATH}" 0 uninstall_done
    nsExec::Exec `"${WIN_POWERSHELL_EXE}" -NoProfile -ExecutionPolicy Bypass -Command "& '${WIN_HELPER_SCRIPT_PATH}' -Action unregister-menu -InstallDir '$INSTDIR'; exit $$LASTEXITCODE"`
    Pop $R0

uninstall_done:
!macroend

!macro customRemoveFiles
  IfFileExists "${WIN_HELPER_SCRIPT_PATH}" 0 remove_continue
    ${if} ${isUpdated}
      nsExec::Exec `"${WIN_POWERSHELL_EXE}" -NoProfile -ExecutionPolicy Bypass -Command "& '${WIN_HELPER_SCRIPT_PATH}' -Action remove-files -InstallDir '$INSTDIR' -UninstallerName '${UNINSTALL_FILENAME}' -Updated; exit $$LASTEXITCODE"`
    ${else}
      nsExec::Exec `"${WIN_POWERSHELL_EXE}" -NoProfile -ExecutionPolicy Bypass -Command "& '${WIN_HELPER_SCRIPT_PATH}' -Action remove-files -InstallDir '$INSTDIR' -UninstallerName '${UNINSTALL_FILENAME}'; exit $$LASTEXITCODE"`
    ${endif}
    Pop $R0
    StrCmp $R0 0 remove_continue remove_failed

remove_failed:
  Abort "Windows uninstall helper failed with exit code $R0"

remove_continue:
  SetOutPath $TEMP
  RMDir /r $INSTDIR
!macroend
