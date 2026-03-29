// eslint-disable e18e/prefer-static-regex
/** @typedef {import('#src/types/snapshot.d.ts').Snapshot} Snapshot */
import fs from 'node:fs/promises'
import path from 'node:path'
import ignore from 'ignore'

const PATTERN_FILE = '.gitignore'
/**
 * Create a node-ignore object with the patterns
 *
 * @param {string} absFilePath - entry key of the directory
 * @return {Promise<string[]>} - patterns
 */
async function readPatterns(absFilePath) {
  try {
    await fs.stat(absFilePath)
  }
  catch {
    // return undefined if not found
    return
  }

  try {
    const content = await fs.readFile(absFilePath, 'utf-8')
    const patterns = content.split(/\r?\n/) // will return [] if content is empty

    const filtered = [...new Set(patterns
      .map(p => p.trim())
      .filter(p => p.startsWith('#') === false && p.length > 0))]

    return filtered
  }
  catch (err) {
    throw new Error(`Error reading file ${absFilePath}. ${err}`)
  }
}

function removeEntry(snapshot, entryKey, type) {
  if (entryKey === '.' && type === 'dir')
    return

  if (type === 'file') {
    const entry = snapshot.fileEntries.get(entryKey)
    snapshot.dirEntries.get(entry.parent).children.delete(path.posix.basename(entryKey))

    snapshot.fileEntries.delete(entryKey)
  }
  else if (type === 'dir') {
    const entry = snapshot.dirEntries.get(entryKey)
    snapshot.dirEntries.get(entry.parent).children.delete(path.posix.basename(entryKey))

    for (const child of entry.children.values()) {
      removeEntry(snapshot, child.path, child.type)
    }
    snapshot.dirEntries.delete(entryKey)
  }
}

/**
 * A wrapper of node-ignore filter
 * @typedef {object} Filter
 * @property {string} dirKey - relative path to the root
 * @property {string[]} patterns - patterns used
 * @property {ignore} ig - node-ignore object
 */

/**
 *
 *
 * @property {Snapshot} snapshot - snapshot of the entire directory
 * @param {string} [dirKey]  - relative path to the root
 * @param {Filter[]} [filterStack] - ignore filter
 */
async function filterDirectory(snapshot, dirKey = '.', filterStack = []) {
  const dirEntry = snapshot.dirEntries.get(dirKey)

  const children = dirEntry.children
  let filters = filterStack
  if (children.has(PATTERN_FILE) && children.get(PATTERN_FILE).type === 'file') {
    const patterns = await readPatterns(path.posix.resolve(snapshot.root, dirKey, PATTERN_FILE))
    filters = filterStack.concat({
      dirKey,
      patterns,
      ig: ignore().add(patterns),
    })
  }

  for (const [, childRef] of children) {
    let ignored = false

    for (const filter of filters) {
      const pathToFilter = path.posix.relative(filter.dirKey, childRef.path) + (childRef.type === 'dir' ? '/' : '')
      const res = filter.ig.ignores(pathToFilter)
      if (ignored === false) {
        ignored = res
      }
      else {
        // double check due to the node-ignore bug
        const check = filter.ig.checkIgnore(pathToFilter)
        if (check.unignored === true) {
          ignored = false
        }
      }
    }

    if (ignored) {
      removeEntry(snapshot, childRef.path, childRef.type)
    }
    else {
      if (childRef.type === 'dir') {
        await filterDirectory(snapshot, childRef.path, filters)
      }
    }
  }

//   if (children.size === 0 && dirKey !== '.') {
//     snapshot.dirEntries.delete(dirKey)
//     snapshot.dirEntries.get(dirEntry.parent)?.children.delete(path.posix.basename(dirKey))
//   }
}

export const gitAdapter = {
  name: 'git',
  /** @param {Snapshot} snapshot */
  async apply(snapshot) {
    // const parentPatterns = ['/folder-a', '/index.js']
    // const ig = ignore().add(parentPatterns)
    // console.log(ig.ignores('folder-a/'))
    // console.log(ig.ignores('index.js'))
    // console.log(ig.ignores('nested/folder-a/'))
    // console.log(ig.ignores('nested/folder-a/a.txt'))
    // console.log(ig.ignores('nested/index.js'))

    // // inside 'nested'
    // const childPatterns = ['!folder-a']
    // ig.add(childPatterns)
    // console.log(ig.ignores('folder-a/'))
    // console.log(ig.ignores('folder-a/a.txt'))
    // console.log(ig.ignores('index.js'))

    // const patterns = ['.yarn/*', '!.yarn/patches', 'abc*.js']
    // let ig = ignore().add(patterns)
    // console.log(ig.checkIgnore('.yarn/'))
    // console.log(ig.checkIgnore('.yarn/index.js'))
    // console.log(ig.checkIgnore('.yarn/patches/'))
    // console.log(ig.checkIgnore('.yarn/patches/patch.js'))
    // console.log(ig.checkIgnore('abcd.js'))

    // console.log(ig.ignores('.yarn/'))
    // console.log(ig.ignores('.yarn/index.js'))
    // console.log(ig.ignores('.yarn/patches/'))
    // console.log(ig.ignores('.yarn/patches/patch.js'))
    // console.log(ig.ignores('abcd.js'))

    // console.log(ignore().add('.yarn/*').ignores('.yarn/'))
    // console.log(ignore().add('.yarn/*').checkIgnore('.yarn/'))
    // console.log(ignore().add('foo**/bar').checkIgnore('foobar'))
    // console.log(ignore().add('bar/').checkIgnore('foo/bar/'))
    // console.log(ignore().add('\\*').ignores('\\'))

    // const childPatterns = ['!folder-a', '!folder-a/', '!/folder-a', '!folder-a/*']
    // console.log(ignore().add(childPatterns).checkIgnore('folder-a/'))
    await filterDirectory(snapshot)
  },
}
