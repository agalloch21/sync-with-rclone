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
CLI 是当前保留的命令行壳层，可独立承接主流程，也方便测试和排查

```bash
npm run start:cli
# 或
node src/cli/index.js

#如果需要直接带参数运行，可参考主流程的调用方式，例如：
node ./src/cli/index.js --mode=push --local=<local-path> --remote=<remote-path>

# 如果你想跳过 config.json，直接按显式 local/remote 运行：
node ./src/cli/index.js --bypass-config --mode=push --local=<local-path> --remote=<remote-path>

# 简写版
node ./src/cli/index.js [--bypass-config] push <local-path> <remote-path>
```

当前推荐使用带名字的参数。
Windows 右键菜单 / Electron 打包运行时可能会额外注入其它 argv，主流程现在会优先解析 `--mode`、`--local`、`--remote`，避免因为参数位置漂移而取错值。


### 4. 使用 Electron 运行
Electron 是当前桌面主入口，用于右键菜单、sync-session 窗口等桌面交互

```bash
npm run start:desktop
# 或
electron .

#如果需要按实际同步动作传入参数，可直接运行桌面入口，例如：
node ./src/electron/main/index.js --mode=push --local=<local-path> --remote=<remote-path>

# 简写版
node ./src/electron/main/index.js push <local-path> <remote-path>
```

这条命令会由 Node 入口转交给 Electron，再进入桌面链路。

### 5. 使用开发模式实时预览 renderer
如果你正在调整 `SyncSession.vue`、`TreeNode.vue` 或 renderer 样式，推荐直接使用开发模式。

```bash
npm run dev:desktop
```

这条命令会：

- 启动 Vite dev server
- 等待 dev server 就绪后自动启动 Electron
- 让 sync-session renderer 在开发时改走 Vite 页面

这样保存 `src/electron/renderer/src/*.vue` 或 `src/electron/renderer/src/styles.css` 后，窗口会自动刷新，能实时看到变化。

如果需要查看 renderer 调试信息，开发模式会默认打开 Electron DevTools。

---

## 配置文件

当前项目默认读取两类配置：

- `sync-with-rclone`配置：`config.json`
- `rclone` 配置：`rclone.conf`

默认读取位置是：

```bash
# windows
<安装目录>/config/

# 例如默认管理员安装后常见为
C:/Program Files/sync-with-rclone/config/

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
  "syncJobs": [
    {
      "name": "ProjectsSynced",
      "rcloneRemote": "synology",
      "localBasePath": "D:/ProjectsSynced",
      "remoteBasePath": "ProjectsSynced",
      "ignorePatterns": []
    }
  ]
}
```

- `globalIgnorePatterns`: 全局忽略规则，作用于所有同步任务，规则语法按 `.gitignore` 风格理解。
- `syncJobs`: 同步任务列表。每次从某个本地目录发起同步时，程序会从这里找出匹配的任务。
- `syncJobs[].name`: 任务名称，用于标识这组同步关系，当前主要用于可读性和后续扩展。
- `syncJobs[].rcloneRemote`: `rclone.conf` 中定义的 remote 名称，例如 `synology`。
- `syncJobs[].localBasePath`: 本地根目录。当前右键触发的目录必须落在这个目录下，程序才会认为它属于该任务。
- `syncJobs[].remoteBasePath`: 远端根目录，不带 remote 名前缀。实际运行时会和 `rcloneRemote` 拼成 `synology:ProjectsSynced` 这样的根路径；如果想直接同步到 remote 根目录，可以写成空字符串 `""`。
- `syncJobs[].ignorePatterns`: 只对当前任务生效的额外忽略规则，会和 `globalIgnorePatterns` 合并。

路径匹配规则：

- 如果触发目录是 `localBasePath` 本身，则默认同步到对应的远端根目录。
- 如果触发目录是 `localBasePath` 的子目录，则会把相对子路径追加到远端根目录后面。
- 多个 `syncJobs` 同时命中时，当前实现会优先选择 `localBasePath` 更长、更具体的那一项。

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
- 准备 `config.json` 和 `rclone.conf` 模板
- 注册 Finder 右键 Quick Actions

`dmg` / `zip` 产物仍可用于开发验证和手动安装，但当前不作为主要安装初始化链路。使用这类产物时，需要手动确认配置目录和 Finder Quick Actions 已经准备好。

安装目录

```bash
# windows
# 程序目录
默认管理员安装通常为 C:/Program Files/sync-with-rclone/
# 配置目录
<安装目录>/config/

# mac
# 程序目录
/Applications/sync-with-rclone.app
# 配置目录
~/Library/Application Support/sync-with-rclone/config/
```
安装后即可在右键菜单里看到 `Push` / `Pull` / `Open Config` 选项
