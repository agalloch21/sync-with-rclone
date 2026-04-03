import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { serializeDiffSnapshot } from '#src/core/serialize-diff-snapshot.js'

function renderTreeLines(nodes, depth = 0) {
  const lines = []
  const indent = '  '.repeat(depth)

  for (const node of nodes) {
    if (node.type === 'directory') {
      const badges = []
      if (node.changes.modified)
        badges.push(`modified:${node.changes.modified}`)
      if (node.changes.added)
        badges.push(`added:${node.changes.added}`)
      if (node.changes.deleted)
        badges.push(`deleted:${node.changes.deleted}`)
      lines.push(`${indent}- ${node.name}/ ${badges.join(' ')}`.trimEnd())
      lines.push(...renderTreeLines(node.children, depth + 1))
      continue
    }

    lines.push(`${indent}- [${node.state}] ${node.path}`)
  }

  return lines
}

function collectSelectedPaths(nodes) {
  const selectedPaths = []
  for (const node of nodes) {
    selectedPaths.push(node.path)
    if (node.children)
      selectedPaths.push(...collectSelectedPaths(node.children))
  }
  return selectedPaths
}

export async function reviewDiffInCli(diffSnapshot) {
  const payload = serializeDiffSnapshot(diffSnapshot)
  const treeLines = renderTreeLines(payload.tree)

  output.write(`\nSync review\n`)
  output.write(`Source: ${payload.srcRoot}\n`)
  output.write(`Destination: ${payload.dstRoot}\n`)
  output.write(`Modified: ${payload.summary.modified}  Added: ${payload.summary.added}  Deleted: ${payload.summary.deleted}\n\n`)

  if (treeLines.length === 0)
    output.write(`No differences found.\n`)
  else
    output.write(`${treeLines.join('\n')}\n`)

  if (!input.isTTY || !output.isTTY) {
    output.write(`\nNon-interactive terminal detected. Continuing with all diff entries.\n`)
    return {
      action: 'confirm',
      selectedPaths: collectSelectedPaths(payload.tree),
    }
  }

  const rl = readline.createInterface({ input, output })

  try {
    while (true) {
      const answer = (await rl.question('\nContinue with this diff? [y/N] ')).trim().toLowerCase()
      if (answer === 'y' || answer === 'yes') {
        return {
          action: 'confirm',
          selectedPaths: collectSelectedPaths(payload.tree),
        }
      }

      if (answer === '' || answer === 'n' || answer === 'no') {
        return {
          action: 'cancel',
          selectedPaths: [],
        }
      }
    }
  }
  finally {
    rl.close()
  }
}
