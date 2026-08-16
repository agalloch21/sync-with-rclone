# sync-with-rclone

一个使用 `rclone` 同步文件、支持 `.gitignore`，并且只需右键单击目标文件夹即可使用的工具。

<img src="assets/showcase.avif" height="400" alt="sync-with-rclone 展示图" title="sync-with-rclone 展示图">

---

## 简介

> - 你是否曾想同步一个非正式或仍处于中间阶段、但值得保存的仓库，却不想经历初始化、暂存、提交，以及在 GitHub 等平台上创建 PR 的整套流程？
> - 你是否曾想在与服务器同步文件时清楚了解具体变化，却在打开 Git 教程后还是用回了原来的文件管理方式？
>
> *sync-with-rclone 正是为你而做。*

### 主要功能

- **只需右键单击目标文件夹即可同步文件。**
- **支持 `.gitignore` 和自定义排除规则。**
- **同步前通过可视化差异树查看并选择要应用的变更。**

---

## 使用方法

### 安装

从 [Releases 页面](https://github.com/agalloch21/sync-with-rclone/releases)下载安装程序。

安装完成后，文件夹右键菜单中会出现 `Push` 和 `Pull` 操作。

### 术语

- `rclone`：本应用将 rclone 用作网络层。Rclone 是一个独立的命令行工具，用于连接远程存储并执行文件操作。
- `server`：本应用将每个已配置的远程存储连接表示为一个 server。Server 定义如何建立连接，但不决定同步哪些文件夹。
- `mapping`：本应用使用 mapping 将一个本地根目录与一个远程根目录配对。同步本地子目录时，应用会在远程根目录下使用相同的相对路径。

### 常见工作流程

##### 1. 连接 server。

目前支持的协议：

- `SFTP`（推荐）
- `FTP`
- `Alias`（指向另一个 rclone remote）

> [!NOTE]
> 当前的差异比较依赖可靠的修改时间；hash 是另一种可能的文件内容区分方式。其他协议是否具备这些能力尚未经过验证。未来将支持更多协议。

##### 2. 创建 mapping。

例如：

```text
本地根目录：/Users/me/workspaces
远程根目录：my-nas:TeamSpaces
```

假设 `some-project` 是本地根目录下的路径。当你同步 `/Users/me/workspaces/some-project` 时，应用会复用这段相对路径，并选择 server 上的 `my-nas:TeamSpaces/some-project`。

##### 3. 右键单击 mapping 内的文件夹，然后选择 `Push` 或 `Pull`。

- **`Push`：将本地变更发送到远程端。**

  应用先使用 `.gitignore` 规则和排除规则过滤本地内容，再与远程文件夹比较。应用所有检测到的变更后，远程文件夹将与过滤后的本地内容一致，其中也包括删除远程文件夹中多余的受管理文件。

- **`Pull`：将远程变更带回本地。**

  应用使用排除规则过滤远程内容，但不应用 `.gitignore` 规则。应用所有检测到的变更后，本地文件夹将与过滤后的远程内容一致，因此通常会被本地 `.gitignore` 隐藏的文件也可能被复制到本地。

*提示：请使用 Push 将内容同步到 server 文件夹，而不要手动编辑这些文件夹，以保持其内容干净。*

> [!NOTE]
> `.gitignore` 解析使用 [`ignore`](https://www.npmjs.com/package/ignore) 库。目前的扫描器支持常见规则、注释、嵌套的 `.gitignore` 文件和 `!` 反向规则。每条规则在解析前都会被去除首尾空白，因此依赖转义后行首或行尾空格的规则无法被完全保留。

> [!NOTE]
> symbolic link 可以作为同步根目录使用，并会被解析为实际目录。根目录内部的 symbolic link 既不会被上传，也不会被遍历。Pull 时，任何跨越内部 symbolic link 的操作都会被标记为失败。

##### 可选：编辑全局或 mapping 专用的排除规则。

排除规则会使匹配的文件对 Push 和 Pull 都不可见。请将它们用于本应用在任一端都不应管理的文件。

*注意：排除规则不支持注释或 `!` 反向规则。*

---

## 运行方式

### 作为可执行程序

同一个可执行程序既可作为桌面应用使用，也可作为命令行工具使用。

```bash
# 打开桌面应用
sync-with-rclone

# 为文件夹打开可视化 Push 会话
sync-with-rclone --session --mode=push --local=<local-path>

# 获取供 AI 或自动化程序使用的机器可读信息
sync-with-rclone list-mappings --json

# 从 AI 或自动化程序运行非交互式同步
sync-with-rclone sync --yes push <local-path>
```

CLI 可以查看和管理 server 与 mapping，也可以执行 Push 和 Pull。这使 AI agent 和自动化程序无需打开 GUI 即可使用本工具。由程序驱动的同步必须包含 `--yes`，表示确认所有检测到的变更。

### 开发时运行

安装依赖：

```bash
npm install
```

以开发模式启动主 GUI：

```bash
npm run dev
```

以开发模式启动同步会话：

```bash
npm run dev:session -- --mode=push --folder=<local-path>
```

构建安装程序：

```bash
# macOS arm64 PKG
npm run dist:mac

# Windows x64 NSIS 安装程序
npm run dist:win
```

---

## 路线图

- [x] 支持 `.gitignore` 文件过滤。
- [x] 从文件夹右键菜单启动 `Push` 或 `Pull`。
- [x] 在 GUI 中以树形结构显示差异。
- [x] 提供配置管理 GUI。
- [ ] 支持 `Push To` 和 `Pull From`。
