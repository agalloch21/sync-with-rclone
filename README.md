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
npm start
# 或
node src/cli/index.js

#如果需要直接带参数运行，可参考主流程的调用方式，例如：
node ./src/cli/index.js --mode=push --local=<local-path> --remote=<remote-path>

# Backward-compatible positional form:
node ./src/cli/index.js push <local-path> <remote-path>
```

### 4. 使用 Electron 运行
Electron 是当前桌面主入口，用于右键菜单、review 窗口、progress 窗口等桌面交互

```bash
npm run desktop
# 或
electron .

#如果需要按实际同步动作传入参数，可直接运行桌面入口，例如：
node ./src/electron/main/index.js --mode=push --local=<local-path> --remote=<remote-path>

# Backward-compatible positional form:
node ./src/electron/main/index.js push <local-path> <remote-path>
```

这条命令会由 Node 入口转交给 Electron，再进入桌面链路。

### 5. 使用开发模式实时预览 renderer
如果你正在调整 `ReviewApp.vue`、`TreeNode.vue` 或 renderer 样式，推荐直接使用开发模式。

```bash
npm run dev:desktop
```

这条命令会：

- 启动 Vite dev server
- 等待 dev server 就绪后自动启动 Electron
- 让 `review.html` 和 `progress.html` 在开发时改走 Vite 页面

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
%APPDATA%/sync-with-rclone/

# mac
待添加
```
---

## 如何打包

构建安装包
```bash
# windows
npm run dist:win
```
---

## 如何安装

运行 `dist/` 下生成的 NSIS 安装包即可。

安装目录

```bash
# windows
# 程序目录
%LOCALAPPDATA%/Programs/sync-with-rclone/
# 配置目录
%APPDATA%/sync-with-rclone/
```
安装后即可在右键菜单里看到Push/Pull选项
