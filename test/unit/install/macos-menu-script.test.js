import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'

const scriptPath = 'scripts/install/macos-menu.sh'

test('macOS Quick Actions write launcher failures to diagnostics.log', async () => {
  const script = await fs.readFile(scriptPath, 'utf8')
  const launchLines = script
    .split('\n')
    .filter(line => line.trim().startsWith('nohup '))

  assert.equal(launchLines.length, 4)
  for (const line of launchLines) {
    assert.match(line, /&gt; \/dev\/null 2&gt;&amp;1 &amp;/)
    assert.doesNotMatch(line, /LOG_FILE|LOGFILE|quick-actions/)
  }

  assert.match(script, /diagnostics\.log/)
  assert.match(script, /log_launcher_error/)
  assert.match(script, /Executable is missing or not executable/)
  assert.match(script, /Application process failed to start/)
  assert.doesNotMatch(script, /Environment check/)
  assert.doesNotMatch(script, /Launcher log:/)
  assert.doesNotMatch(script, /quick-actions\.log|sync-session\.log/)
})
