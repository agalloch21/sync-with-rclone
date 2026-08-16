export const snapshotEmpty = {
  root: '/demo/root',
  files: [],
}

export const snapshotSimple = {
  root: '/demo/root',
  files: [
    { path: '.gitignore', size: 10, mtimeMs: 1 },
    { path: 'nested/.gitignore', size: 10, mtimeMs: 1 },
    { path: 'nested/b.js', size: 10, mtimeMs: 1 },
    { path: 'nested/deeper-nested/.gitignore', size: 10, mtimeMs: 1 },
    { path: 'nested/deeper-nested/c.js', size: 10, mtimeMs: 1 },
    { path: 'node_modules/a.js', size: 20, mtimeMs: 1 },
    { path: 'src/index.js', size: 20, mtimeMs: 1 },
  ],
}
