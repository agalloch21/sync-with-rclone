// import path from 'node:path'

// export function createSnapshot(){
//     /** @type {import('#src/types/snapshot.d.ts').Snapshot} */
//     const snapshot = {
//         root: path.resolve('test/fixtures/ignore'),
//         entriesByPath: new Map([
//             []
//         ]),
//     }

//     return snapshot
// }
export const snapshotEmpty = {
  root: '/demo/root',
  entriesByPath: new Map([]),
  childrenByPath: new Map([
    ['.', []],
  ]),
}

export const snapshotSimple = {
  root: '/demo/root',
  entriesByPath: new Map([
    ['.gitignore', { type: 'file', path: '.gitignore', size: 10, mtimeMs: 1 }],
    ['src/index.js', { type: 'file', path: 'src/index.js', size: 20, mtimeMs: 1 }],
    ['node_modules', { type: 'dir', path: 'node_modules' }],
    ['node_modules/a.js', { type: 'file', path: 'node_modules/a.js', size: 20, mtimeMs: 1 }],
    ['nested', { type: 'dir', path: 'nested' }],
    ['nested/.gitignore', { type: 'file', path: 'nested/.gitignore', size: 10, mtimeMs: 1 }],
    ['nested/b.js', { type: 'file', path: 'nested/b.js', size: 10, mtimeMs: 1 }],
    ['nested/deeper-nested', { type: 'dir', path: 'nested/deeper-nested' }],
    ['nested/deeper-nested/.gitignore', { type: 'file', path: 'nested/deeper-nested/.gitignore', size: 10, mtimeMs: 1 }],
    ['nested/deeper-nested/c.js', { type: 'file', path: 'nested/deeper-nested/c.js', size: 10, mtimeMs: 1 }],
  ]),
  childrenByPath: new Map([
    ['.', ['.gitignore', 'src', 'node_modules', 'nested']],
    ['src', ['index.js']],
    ['node_modules', ['a.js']],
    ['nested', ['.gitignore', 'b.js', 'deeper-nested']],
    ['nested/deeper-nested', ['.gitignore', 'c.js']],
  ]),
}
