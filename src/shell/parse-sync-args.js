const SYNC_MODES = new Set(['push', 'pull'])
const FALSEY_OPTION_VALUES = new Set(['0', 'false', 'no', 'off'])

function readOptionValue(token, argv, index) {
  const equalIndex = token.indexOf('=')
  if (equalIndex !== -1)
    return { value: token.slice(equalIndex + 1), nextIndex: index }

  const nextValue = argv[index + 1]
  if (nextValue == null || nextValue.startsWith('--'))
    return { value: '', nextIndex: index }

  return { value: nextValue, nextIndex: index + 1 }
}

function matchesOption(token, names) {
  return names.some(name => token === name || token.startsWith(`${name}=`))
}

export function parseSyncArgs(argv = []) {
  const options = {
    mode: '',
    localFolderPath: '',
    remoteFolderPath: '',
    bypassConfig: false,
  }
  const positionalArgs = []

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token)
      continue

    if (matchesOption(token, ['--mode'])) {
      const result = readOptionValue(token, argv, index)
      options.mode = result.value
      index = result.nextIndex
      continue
    }

    if (matchesOption(token, ['--local', '--local-path', '--folder'])) {
      const result = readOptionValue(token, argv, index)
      options.localFolderPath = result.value
      index = result.nextIndex
      continue
    }

    if (matchesOption(token, ['--remote', '--remote-path'])) {
      const result = readOptionValue(token, argv, index)
      options.remoteFolderPath = result.value
      index = result.nextIndex
      continue
    }

    if (token === '--bypass-config' || token === '--bypassConfig') {
      options.bypassConfig = true
      continue
    }

    if (token.startsWith('--bypass-config=') || token.startsWith('--bypassConfig=')) {
      const result = readOptionValue(token, argv, index)
      options.bypassConfig = !FALSEY_OPTION_VALUES.has(result.value.toLowerCase())
      index = result.nextIndex
      continue
    }

    positionalArgs.push(token)
  }

  if (!options.mode) {
    const modeIndex = positionalArgs.findIndex(arg => SYNC_MODES.has(arg))
    if (modeIndex !== -1) {
      options.mode = positionalArgs[modeIndex]

      if (!options.localFolderPath)
        options.localFolderPath = positionalArgs[modeIndex + 1] || ''

      if (!options.remoteFolderPath)
        options.remoteFolderPath = positionalArgs[modeIndex + 2] || ''
    }
  }

  return {
    mode: options.mode || 'push',
    localFolderPath: options.localFolderPath,
    remoteFolderPath: options.remoteFolderPath,
    bypassConfig: options.bypassConfig,
  }
}
