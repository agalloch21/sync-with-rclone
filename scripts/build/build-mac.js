import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { Arch, build, Platform } from 'electron-builder'

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))

const targetArg = process.argv[2] || 'pkg'
const archArg = process.argv[3] || 'arm64'
const outputArg = process.argv[4] || ''

const supportedTargets = new Set(['dmg', 'zip', 'pkg', 'dir'])
const requestedTargets = targetArg
  .split(',')
  .map(target => target.trim())
  .filter(Boolean)

if (requestedTargets.length === 0 || requestedTargets.some(target => !supportedTargets.has(target))) {
  throw new Error(`Unsupported mac target list: ${targetArg}`)
}

if (!['arm64', 'x64'].includes(archArg)) {
  throw new Error(`Unsupported mac arch: ${archArg}`)
}

const arch = archArg === 'x64' ? Arch.x64 : Arch.arm64
const macBinaryName = archArg === 'x64' ? 'rclone-osx-amd64' : 'rclone-osx-arm64'
const assetPlatform = archArg === 'x64' ? 'mac-x64' : 'mac'

function runNodeScript(scriptPath, args = []) {
  execFileSync(process.execPath, [scriptPath, ...args], { stdio: 'inherit' })
}

function runNpmScript(scriptName) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  execFileSync(npmCommand, ['run', scriptName], { stdio: 'inherit' })
}

runNodeScript('scripts/build/verify-assets.js', [assetPlatform])
runNpmScript('build:renderer')
runNodeScript('scripts/build/verify-build.js')

const config = {
  ...packageJson.build,
  directories: {
    ...packageJson.build.directories,
    ...(outputArg ? { output: outputArg } : {}),
  },
  mac: {
    ...packageJson.build.mac,
    target: requestedTargets,
    extraResources: [
      {
        from: 'resources/binaries',
        to: 'binaries',
        filter: [macBinaryName],
      },
    ],
  },
}

await build({
  config,
  targets: Platform.MAC.createTarget(requestedTargets, arch),
})
