import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Arch, Platform, build } from 'electron-builder'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const packageJsonPath = path.join(projectRoot, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

const targetArg = process.argv[2] || 'dmg,zip'
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
