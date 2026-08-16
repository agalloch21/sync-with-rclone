# sync-with-rclone

A tool that uses `rclone` to sync files with `.gitignore` support by simply right-clicking the desired folder.

<img src="docs/assets/showcase.avif" height="400" alt="sync-with-rclone showcase" title="sync-with-rclone showcase">

---

## Introduction

> - Have you ever wanted to sync an unofficial or intermediate repository that's still worth saving, without bothering to init, add, commit, and open a PR on platforms like GitHub?
> - Have you ever wanted to sync files with a server while knowing exactly what changed, but ended up sticking to your old way of managing files after opening a Git tutorial?
>
> *sync-with-rclone is made for you.*

### Key features

- **Sync files by simply right-clicking the desired folder.**
- **Support `.gitignore` and custom exclusion patterns.**
- **Review a visual, selective diff tree before syncing.**

---

## How to use

### Installation

Download an installer from the [Releases page](https://github.com/agalloch21/sync-with-rclone/releases).

After installation, the `Push` and `Pull` actions are available from the folder context menu.

### Terminology

- `rclone`: The app uses rclone as its network layer. Rclone is an independent command-line tool that connects to remote storage and performs file operations.
- `server`: The app represents each configured remote-storage connection as a server. A server defines how to connect, but not which folders should sync.
- `mapping`: The app uses a mapping to pair a local root with a remote root. When you sync a local subfolder, the app uses the same relative path under the remote root.

### Common workflow

##### 1. Connect to a server.
Currently supported protocols:

- `SFTP` (recommended)
- `FTP`
- `Alias` (points to another rclone remote)

> [!NOTE]
> The current diff uses reliable modification times; hashes are another possible way to distinguish file contents. Other protocols have not yet been verified for these capabilities. More protocols will be supported in the future.

##### 2. Create a mapping.

  For example:

  ```text
  LOCAL root:  /Users/me/workspaces
  REMOTE root: my-nas:TeamSpaces
  ```

  Assume `some-project` is the path below the local root. When you sync `/Users/me/workspaces/some-project`, the app reuses that relative path and selects `my-nas:TeamSpaces/some-project` on the server.

##### 3. Right-click a folder inside a mapping and choose `Push` or `Pull`.

   - **`Push`: sends local changes to remote.**

     The app filters local content using `.gitignore` rules and exclusion patterns, then compares it with the remote folder. Applying every detected change makes the remote folder match the filtered local content, including deleting extra managed files there.

   - **`Pull`: brings remote changes to local.**

     The app filters remote content using exclusion patterns, but does not apply `.gitignore` rules. Applying every detected change makes the local folder match the filtered remote content, so files normally hidden by a local `.gitignore` can be copied to local.

   *Tip: Use Push instead of editing server folders manually to keep them clean.*

> [!NOTE]
> `.gitignore` parsing uses the [`ignore`](https://www.npmjs.com/package/ignore) library. The current scanner supports common patterns, comments, nested `.gitignore` files, and `!` negation. It trims each rule before parsing, so rules that depend on escaped leading or trailing spaces are not preserved exactly.

> [!NOTE]
> A symbolic link may be used as the synchronization root and is resolved to its real directory. Symbolic links inside that root will neither be uploaded nor traversed. During Pull, any operation that crosses an internal symbolic link will be reported as failed.

##### Optional. Edit global or mapping-specific exclusion patterns.
Exclusion patterns make matching files invisible to both Push and Pull. Use them for files that this app should never manage on either side.
*Caution: Exclusion patterns do not support comments or `!` negation.*


---

## How to run

### As an executable

The same executable works as both a desktop app and a command-line tool.

```bash
# Open the desktop app
sync-with-rclone

# Open a visual Push session for a folder
sync-with-rclone --session --mode=push --local=<local-path>

# Get machine-readable information for AI or automation
sync-with-rclone list-mappings --json

# Run a non-interactive sync from AI or automation
sync-with-rclone sync --yes push <local-path>
```

The CLI can inspect and manage servers and mappings as well as run Push and Pull operations. This makes the tool usable by AI agents and automation without opening the GUI. Machine-driven syncs must include `--yes`; it confirms all detected changes.

### During development

Install dependencies:

```bash
npm install
```

Start the main GUI in development mode:

```bash
npm run dev
```

Start a sync session in development mode:

```bash
npm run dev:session -- --mode=push --folder=<local-path>
```

Build installers:

```bash
# macOS arm64 PKG
npm run dist:mac

# Windows x64 NSIS installer
npm run dist:win
```

---

## Roadmap

- [x] Support `.gitignore` file filtering.
- [x] Start `Push` or `Pull` from the folder context menu.
- [x] Display differences as a tree in the GUI.
- [x] Provide a GUI for configuration management.
- [ ] Support `Push To` and `Pull From`.
