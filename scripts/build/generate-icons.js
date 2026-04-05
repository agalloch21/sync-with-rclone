import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(currentFilePath), '../..')
const sourcePngPath = path.join(projectRoot, 'logo.png')
const installDirectory = path.join(projectRoot, 'scripts', 'install')
const macIconsetDirectory = path.join(os.tmpdir(), `sync-with-rclone.iconset.${process.pid}`)
const windowsIconPath = path.join(installDirectory, 'icon.ico')
const fallbackPngPath = path.join(installDirectory, 'icon.png')

const MAC_ICONSET_FILES = [
  { fileName: 'icon_16x16.png', size: 16 },
  { fileName: 'icon_16x16@2x.png', size: 32 },
  { fileName: 'icon_32x32.png', size: 32 },
  { fileName: 'icon_32x32@2x.png', size: 64 },
  { fileName: 'icon_128x128.png', size: 128 },
  { fileName: 'icon_128x128@2x.png', size: 256 },
  { fileName: 'icon_256x256.png', size: 256 },
  { fileName: 'icon_256x256@2x.png', size: 512 },
  { fileName: 'icon_512x512.png', size: 512 },
  { fileName: 'icon_512x512@2x.png', size: 1024 },
]

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]

function getDirectoryWidth(size) {
  return size === 256 ? 0 : size
}

function getDirectoryHeight(size) {
  return size === 256 ? 0 : size
}

function makeDirectoryEntry(size, pngLength, offset) {
  const entry = Buffer.alloc(16)
  entry.writeUInt8(getDirectoryWidth(size), 0)
  entry.writeUInt8(getDirectoryHeight(size), 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngLength, 8)
  entry.writeUInt32LE(offset, 12)
  return entry
}

function escapeForPowerShellSingleQuotedString(value) {
  return value.replaceAll("'", "''")
}

export function getResizeToolForPlatform(platform = process.platform) {
  if (platform === 'darwin')
    return 'sips'

  if (platform === 'win32')
    return 'powershell'

  return null
}

async function resizePngWithSips(sourcePath, targetPath, size) {
  await execFileAsync('sips', ['-z', String(size), String(size), sourcePath, '--out', targetPath])
}

async function resizePngWithWindowsPowerShell(sourcePath, targetPath, size) {
  const escapedSourcePath = escapeForPowerShellSingleQuotedString(sourcePath)
  const escapedTargetPath = escapeForPowerShellSingleQuotedString(targetPath)
  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$sourcePath = '${escapedSourcePath}'
$targetPath = '${escapedTargetPath}'
$size = ${size}
$source = [System.Drawing.Image]::FromFile($sourcePath)
try {
  $bitmap = New-Object System.Drawing.Bitmap($size, $size)
  try {
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.DrawImage($source, 0, 0, $size, $size)
      $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $graphics.Dispose()
    }
  }
  finally {
    $bitmap.Dispose()
  }
}
finally {
  $source.Dispose()
}
`

  await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    script,
  ])

  await fs.access(targetPath)
}

export async function resizePng(sourcePath, targetPath, size, platform = process.platform) {
  const resizeTool = getResizeToolForPlatform(platform)

  if (resizeTool === 'sips') {
    await resizePngWithSips(sourcePath, targetPath, size)
    return
  }

  if (resizeTool === 'powershell') {
    await resizePngWithWindowsPowerShell(sourcePath, targetPath, size)
    return
  }

  throw new Error(`No PNG resize tool configured for platform: ${platform}`)
}

async function generateMacIcon() {
  await fs.rm(macIconsetDirectory, { recursive: true, force: true })
  await fs.mkdir(macIconsetDirectory, { recursive: true })

  try {
    for (const file of MAC_ICONSET_FILES)
      await resizePng(sourcePngPath, path.join(macIconsetDirectory, file.fileName), file.size)

    const macIconPath = path.join(installDirectory, 'icon.icns')
    await execFileAsync('iconutil', ['-c', 'icns', macIconsetDirectory, '-o', macIconPath])
  }
  catch (error) {
    console.warn(`Skipping .icns generation and using PNG fallback: ${error.message}`)
  }
  finally {
    await fs.rm(macIconsetDirectory, { recursive: true, force: true })
  }
}

async function generateWindowsIcon() {
  const resizedPngBuffers = []
  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-with-rclone-ico-'))

  try {
    for (const size of ICO_SIZES) {
      const resizedPath = path.join(tempDirectory, `icon-${size}.png`)
      await resizePng(sourcePngPath, resizedPath, size)
      resizedPngBuffers.push({
        size,
        buffer: await fs.readFile(resizedPath),
      })
    }

    const header = Buffer.alloc(6)
    header.writeUInt16LE(0, 0)
    header.writeUInt16LE(1, 2)
    header.writeUInt16LE(resizedPngBuffers.length, 4)

    let offset = header.length + resizedPngBuffers.length * 16
    const directoryEntries = []
    const payloadBuffers = []

    for (const image of resizedPngBuffers) {
      directoryEntries.push(makeDirectoryEntry(image.size, image.buffer.length, offset))
      payloadBuffers.push(image.buffer)
      offset += image.buffer.length
    }

    await fs.writeFile(windowsIconPath, Buffer.concat([header, ...directoryEntries, ...payloadBuffers]))
  }
  finally {
    await fs.rm(tempDirectory, { recursive: true, force: true })
  }
}

async function copyFallbackPng() {
  await fs.copyFile(sourcePngPath, fallbackPngPath)
}

async function main() {
  await fs.mkdir(installDirectory, { recursive: true })
  await copyFallbackPng()
  await generateMacIcon()
  await generateWindowsIcon()
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
