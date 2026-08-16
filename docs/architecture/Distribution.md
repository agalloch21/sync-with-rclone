# Distribution architecture

> 返回 [架构总览](../Architecture.md)。

## 1. 打包与安装

### 1.1 打包步骤

1. macOS 打包统一由 `scripts/build/build-mac.js` 校验目标架构的 assets
2. Vite 构建 renderer 页面，并校验 Electron 加载所需的构建产物
3. electron-builder 收集 Electron main、preload、renderer 构建产物
4. 打包时附带目标架构需要运行的 resources/ 内容
5. Windows 下由 NSIS 生成安装器
6. 安装器负责注册右键菜单

### 1.2 安装步骤

1. 用户运行安装器
2. 安装器写入程序文件
3. 安装器准备用户级配置目录和系统集成；默认 `config.json` 由应用启动时创建
4. 安装器分发 bundled binaries 和安装脚本
5. 安装器注册右键菜单
6. 用户后续通过右键菜单或 CLI 启动程序


### 1.3 安装后的目录结构

Windows 当前安装后的目录结构可按下面理解：

```text
安装目录（管理员安装时通常是 `C:/Program Files/sync-with-rclone/`）:
  sync-with-rclone.exe
  resources/
    app.asar
    binaries/

用户数据目录（`%APPDATA%/sync-with-rclone/`）:
  config/
    config.json
    rclone.conf
  runtime/
    sync-admission/
  logs/
```

含义是：

- 程序本体安装在安装目录
- 程序运行时读取的配置默认位于当前用户的 `%APPDATA%/sync-with-rclone/config/`
- operation history 与跨平台 `diagnostics.log` 默认位于当前用户的 `%APPDATA%/sync-with-rclone/logs/`
- Windows 右键菜单直接启动应用，不依赖 stdout/stderr 重定向；session 原始错误由应用自身写入诊断日志
- 升级旧版本时，安装目录下已有的 `config/` 会通过安装器备份恢复到新的用户级配置目录
- `rclone` 二进制来自安装目录下的 bundled resources
- Windows 右键菜单调用时使用显式 `--session` 加命名参数 `--mode` 和 `--local`，避免打包后的额外 argv 干扰参数定位

## 2. 当前打包和运行结论

当前 renderer 的构建方式是：

- 使用 Vite 构建
- 由 Vite 把 `.vue` 源码编译成 Electron 可加载页面
- Electron 加载的是构建产物，而不是直接执行 `.vue`

当前打包方式是：

- 使用 `electron-builder`
- Windows 安装器使用 `NSIS`
- 安装器负责注册右键菜单
- 安装产物包含 bundled `rclone`
- mac 当前主要安装链路是 `pkg`，配置目录和 Finder Quick Actions 初始化由安装阶段承担
- Finder Quick Actions 把应用启动前可检测的 launcher failure 写入共用的 `diagnostics.log`；成功启动后的 stdout/stderr 不再由启动器重定向
- `dmg` / `zip` 产物当前只作为开发验证和手动安装产物，不作为主要安装初始化链路

当前尚未视为稳定事实的部分是：

- Windows 用户级配置目录的升级迁移与卸载保留策略
- 覆盖安装 / 卸载链路
