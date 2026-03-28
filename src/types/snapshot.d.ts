// export interface FileEntry {
//   path: string
//   type: 'file'
//   mtimeMs: number
//   size: number
// }

// export interface DirEntry {
//   path: string
//   type: 'dir'
// }

// export type Entry = FileEntry | DirEntry

// export interface Snapshot {
//   /** Absolute path of the root directory. */
//   root: string
//   /**  Map of file/folder entries, where keys are paths relative to `root`. */
//   entriesByPath: Map<string, Entry>
//   /** Map representing directory structure. Keys are directory paths relative to `root`, and values are arrays of child entry names. */
//   childrenByPath: Map<string, string[]> //
// }

export interface FileEntry {
  parent: string
  mtimeMs: number
  size: number
}

export interface ChildRef {
  path: string
  type: 'file' | 'dir' | undefined
}

export interface DirEntry {
  parent: string | null
  children: Map<string, ChildRef>
}

export type Entry = FileEntry | DirEntry

export interface Snapshot {
  /** Absolute path of the root directory. */
  root: string
  /**  Map of file/folder entries, where keys are paths relative to `root`. */
  fileEntries: Map<string, FileEntry>
  /** Map representing directory structure. Keys are directory paths relative to `root`, and values are arrays of child entry names. */
  dirEntries: Map<string, DirEntry> //
}
