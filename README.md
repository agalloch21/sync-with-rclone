# sync-with-rclone

`sync-with-rclone` 是一个面向中间工程的同步工具。

它主要解决这样一类目录的同步问题：

- 有保留价值，但还没重要到值得单独建立一个 Git 仓库
- 目录里常常带着 `node_modules`、构建产物、缓存文件、临时文件
- 一般同步软件不支持 `.gitignore`，无法很好地排除这些内容

这个项目的目标，是让这类目录也能像项目目录一样，更可控地进行备份和找回。

## 核心功能
- 支持 `.gitignore`过滤规则
- 右键菜单快捷操作
- GUI界面展示差异

## Roadmap
- [x] 支持.gitignore筛选文件
- [x] 支持发起 `Push` 或 `Pull`操作
- [x] GUI展示差异树
- [x] 添加右键菜单栏的便捷操作
- [x] 形成一键安装包
- [ ] 支持发起 `Push To` 或 `Pull From`操作
- [ ] 发起 `Push To` 或 `Pull From`操作时展示远程文件夹的目录树供用户选择
- [ ] GUI配置管理界面

---

## 如何测试

### 1. 安装依赖

```bash
npm install
```

### 2. 构建 renderer

```bash
npm run build:renderer
```

当前 Electron renderer 使用 Vite 构建，因此在运行桌面窗口前，需要先有一次 renderer 构建产物。

### 3. 使用 CLI 运行
CLI 和桌面界面共用 Electron 产品入口。入口识别正式 CLI 子命令后直接加载终端壳层，不启动 renderer。

```bash
npm start -- <command>

#如果需要直接带参数运行，可参考主流程的调用方式，例如：
npm start -- sync --mode=push --local=<local-path> --remote=<remote-path>

# 如果你想跳过 config.json，直接按显式 local/remote 运行：
npm start -- sync --bypass-config --mode=push --local=<local-path> --remote=<remote-path>

# positional sync 参数仍可用于明确的 sync 子命令
npm start -- sync push <local-path> <remote-path>

# 交互终端默认展示差异并请求 yes/no 确认；--yes 跳过确认并同步全部差异
npm start -- sync --yes push <local-path> <remote-path>
```

CLI 必须显式提供 `sync`、`list-tasks` 等正式子命令；同步参数推荐使用带名字的写法。
当 stdin 或 stdout 不是 TTY（例如 agent、脚本或管道调用）时，同步必须显式传入 `--yes`，否则会在写入文件前拒绝执行。
`npm start` 会先构建 renderer，因此同一个命令也可以不带参数启动主窗口，或者通过 `--session` 启动 sync-session。
Windows 右键菜单 / Electron 打包运行时可能会额外注入其它 argv，主流程现在会优先解析 `--mode`、`--local`、`--remote`，避免因为参数位置漂移而取错值。

### Symbolic link 限制

symbolic link 可以作为同步根路径；context resolution 会先解析它的 real path，后续扫描、执行和并发范围判断只使用真实目录。同步根目录内部的 symbolic link 当前不会作为本地文件上传，也不会扫描它指向的内容。内部目录 link 在 Pull 时应被视为本地挂载点还是由远端普通目录替换仍待确定；在该规则落实前，应避免 Pull 到包含同名内部目录 link 的本地路径。


### 4. 使用 Electron 运行
`src/shell/index.cjs` 是统一产品入口；它根据参数进入 Electron 桌面壳层、sync-session 或 CLI 模式。

```bash
# 如果需要按实际同步动作传入参数，可直接运行桌面入口，例如：
npm run dev:session -- --mode=push --local=<local-path> --remote=<remote-path>
```

开发脚本会启动 renderer dev server，再把参数交给 `src/shell/index.cjs`。

打包后的 Electron 可执行文件也可以作为命令入口使用：

```bash
# 打开主窗口
sync-with-rclone

# 打开 sync-session
sync-with-rclone --session --mode=push --local=<local-path>

# 执行 CLI command
sync-with-rclone list-servers
sync-with-rclone list-tasks --json
sync-with-rclone sync --yes push <local-path> <remote-path>
```

直接执行构建产物时没有 npm 参与，因此不需要 npm 的参数分隔符 `--`。

### 5. 使用开发模式实时预览 renderer
如果你正在调整桌面界面或 renderer 样式，推荐直接使用对应的开发模式。

```bash
npm run dev

# 如果需要预览右键菜单打开的同步会话窗口：
npm run dev:session -- --mode=push --folder=<local-path>

# 主窗口已经运行时，可以继续提交更多互不重叠的会话：
npm run dev:session -- --mode=pull --folder=<another-local-path>
```

这条命令会：

- 在没有 dev server 时启动 Vite；已有本项目 Vite 时直接复用
- 等待 dev server 就绪后自动启动 Electron
- 让桌面 renderer 在开发时改走 Vite 页面
- 把后续 session 请求交给同一个 Electron Main 进程

这样保存 renderer 源码后，窗口会自动刷新，能实时看到变化。

如果需要查看 renderer 调试信息，开发模式会默认打开 Electron DevTools。

macOS Finder Quick Action 只负责异步提交同步请求。同步进度和结果由 session window 展示；失败时如果 `quick-actions.log` 存在，可以从会话窗口在 Finder 中定位该文件。结构化操作记录仍保存在主窗口 Logs panel。

---

## 配置文件

当前项目默认读取两类配置：

- `sync-with-rclone`配置：`config.json`
- `rclone` 配置：`rclone.conf`

默认读取位置是：

```bash
# windows
%APPDATA%/sync-with-rclone/config/

# mac
~/Library/Application Support/sync-with-rclone/config/
```

### config.json 字段说明

```json
{
  "globalIgnorePatterns": [
    ".DS_Store",
    "Thumbs.db"
  ],
  "syncTasks": [
    {
      "name": "ProjectsSynced",
      "rcloneRemote": "synology-sftp",
      "localBasePath": "D:/ProjectsSynced",
      "remoteBasePath": "ProjectsSynced",
      "ignorePatterns": [],
      "lastSyncMode": null,
      "lastSyncFolder": null,
      "lastSyncDate": null
    }
  ]
}
```

- `globalIgnorePatterns`: 全局忽略规则，作用于所有同步任务，规则语法按 `.gitignore` 风格理解。
- `syncTasks`: 同步任务列表。每次从某个本地目录发起同步时，程序会从这里找出匹配的任务。
- `syncTasks[].name`: 任务名称，用于标识这组同步关系，当前主要用于可读性和后续扩展。
- `syncTasks[].rcloneRemote`: `rclone.conf` 中定义的 remote 名称，例如 `synology-sftp`。
- `syncTasks[].localBasePath`: 本地根目录。当前右键触发的目录必须落在这个目录下，程序才会认为它属于该任务。
- `syncTasks[].remoteBasePath`: 远端根目录，不带 remote 名前缀。实际运行时会和 `rcloneRemote` 拼成 `synology-sftp:ProjectsSynced` 这样的根路径；如果想直接同步到 remote 根目录，可以写成空字符串 `""`。
- `syncTasks[].ignorePatterns`: 只对当前任务生效的额外忽略规则，会和 `globalIgnorePatterns` 合并。
- `syncTasks[].lastSyncMode`: 上一次同步方向，当前可为空。
- `syncTasks[].lastSyncFolder`: 上一次同步的相对文件夹，当前可为空。
- `syncTasks[].lastSyncDate`: 上一次同步时间，建议使用 ISO 字符串，当前可为空。

### 推荐远端协议

当前正式支持的 NAS 远端基线是 SFTP。同步预览会用文件路径、大小和修改时间判断差异，因此远端必须能可靠读写文件 `mtime`。rclone 的 SFTP backend 可以设置并读取 1 秒精度的 `mtime`，适合作为 Synology NAS 的默认方案。

推荐的 `rclone.conf` 形态：

```ini
[synology-sftp]
type = sftp
host = <nas-host>
user = <user>
pass = <obscured-password>
set_modtime = true
shell_type = unix
```

普通同步不要求配置 `path_override`，也不要在基线配置里启用 `md5sum_command` 或 `sha1sum_command`。当前可靠性基线只依赖 SFTP 的 `mtime` 保留能力；hash 校验会留给未来配置界面做能力测试后再启用。

不推荐使用 WebDAV 承担可靠同步。Synology WebDAV 暴露的 `getlastmodified` 不能保证等于源文件 `mtime`，会导致刚同步过的文件在下一次预览里再次显示为不同。FTP 可能具备 1 秒 `mtime`，但没有 hash 支持，连接行为也弱于 SFTP，因此只作为非推荐备选。

路径匹配规则：

- 如果触发目录是 `localBasePath` 本身，则默认同步到对应的远端根目录。
- 如果触发目录是 `localBasePath` 的子目录，则会把相对子路径追加到远端根目录后面。
- 多个 `syncTasks` 同时命中时，当前实现会优先选择 `localBasePath` 更长、更具体的那一项。

### 环境变量

- `DEBUG`: CLI 失败时输出 stack，方便排查。
- `CONFIG_DIRECTORY`: 覆盖默认配置目录。适合测试时临时挂一套 `config.json` 和 `rclone.conf`。
- `CONFIG_PATH`: 直接指定 `config.json` 的完整路径。
- `RCLONE_CONFIG_PATH`: 直接指定 `rclone.conf` 的完整路径。

---

## 如何打包

构建安装包
```bash
# windows
npm run dist:win

# mac dmg + zip
npm run dist:mac

# mac dmg + zip (x64)
npm run dist:mac:x64

# mac pkg
npm run dist:pkg

# mac pkg (x64)
npm run dist:pkg:x64
```
---

## 如何安装

Windows 运行 `dist/` 下生成的 NSIS 安装包即可。

mac 当前推荐使用 `pkg` 安装。

运行 `.pkg` 安装器后，程序会安装到 `/Applications/sync-with-rclone.app`，并在安装阶段完成：

- 创建 `~/Library/Application Support/sync-with-rclone/config/`
- 注册 Finder 右键 Quick Actions

首次启动时，应用会在缺少 `config.json` 时创建默认配置；`rclone.conf` 由 rclone 在创建 remote 时管理，缺失时表示当前没有 servers。

`dmg` / `zip` 产物仍可用于开发验证和手动安装，但当前不作为主要安装初始化链路。使用这类产物时，需要手动确认配置目录和 Finder Quick Actions 已经准备好。

安装目录

```bash
# windows
# 程序目录
默认管理员安装通常为 C:/Program Files/sync-with-rclone/
# 配置目录
%APPDATA%/sync-with-rclone/config/

# mac
# 程序目录
/Applications/sync-with-rclone.app
# 配置目录
~/Library/Application Support/sync-with-rclone/config/
```
安装后即可在右键菜单里看到 `Push` / `Pull` / `Open Config` 选项

Windows 升级旧版本时，安装目录中已有的 `config/` 会迁移到当前用户的 AppData 配置目录；卸载程序不会删除该用户配置目录。
