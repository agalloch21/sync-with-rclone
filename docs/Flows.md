# sync-with-rclone 流程图

## 1. 从用户点击到执行完成的总流程

```mermaid
sequenceDiagram
  participant U as 用户
  participant S as Shell
  participant A as App
  participant C as Core
  participant R as Review UI
  participant X as Apply

  U->>S: 触发 Push / Pull / Push To... / Pull From...
  S->>A: 传入动作类型和本地路径
  A->>A: 读取配置并解析本次同步范围
  A->>C: 发起扫描
  C->>C: 生成 DiffSnapshot
  C-->>S: 请求 review
  S->>R: 打开差异确认界面
  R->>U: 展示差异树
  U->>R: 勾选并确认/取消
  R-->>S: 返回 ReviewResult
  S->>C: 恢复执行
  C->>X: 生成并执行 SyncPlan
  X-->>U: 展示进度与结果
```

这张图的用途是先帮助人理解全貌。

## 2. 安装到触发流程

```mermaid
sequenceDiagram
  participant I as 安装器
  participant M as 系统右键菜单
  participant E as Electron Main
  participant A as App

  I->>I: 安装 Electron 应用本体
  I->>I: 安装 bundled rclone
  I->>I: 分发配置模板
  I->>M: 注册 Windows 右键菜单
  M->>E: 传入动作类型和本地路径
  E->>A: 调用 startSync(...)
```

## 3. 配置解析流程

```mermaid
sequenceDiagram
  participant S as Shell
  participant A as App

  S->>A: 传入动作类型和本地路径
  A->>A: 规范化路径
  A->>A: 读取 config
  A->>A: 确定当前目录归属
  A->>A: 确定对应的远端位置或可选远端目录
  A->>A: 生成 runtime paths
```

这一步的职责是：

- 判断当前本地路径属于哪一组同步关系
- 在 `Push / Pull` 下得到默认对应的远端路径
- 在 `Push To... / Pull From...` 下得到当前范围内可选择的远端目录
- 拒绝跨同步关系组合

## 4. `Push` 流程

```mermaid
sequenceDiagram
  participant U as 用户
  participant S as Shell
  participant A as App
  participant C as Core
  participant R as Review UI

  U->>S: 触发 Push
  S->>A: 传入本地路径
  A->>A: 解析默认远端目标路径
  A->>C: 发起 Push
  C->>C: 扫描本地与远端
  C->>C: 生成 DiffSnapshot
  C-->>S: 请求 review
  S->>R: 打开 review
  R->>U: 展示差异树
  U->>R: 勾选并确认/取消
  R-->>S: 返回 ReviewResult
  S->>C: 恢复执行
  C->>C: 生成并执行 SyncPlan
```

`Push` 的关键点是：

- 当前本地目录是源
- 默认对应的远端目录是目标

## 5. `Pull` 流程

```mermaid
sequenceDiagram
  participant U as 用户
  participant S as Shell
  participant A as App
  participant C as Core
  participant R as Review UI

  U->>S: 触发 Pull
  S->>A: 传入本地路径
  A->>A: 解析默认远端来源路径
  A->>C: 发起 Pull
  C->>C: 扫描远端与本地
  C->>C: 生成 DiffSnapshot
  C-->>S: 请求 review
  S->>R: 打开 review
  R->>U: 展示差异树
  U->>R: 勾选并确认/取消
  R-->>S: 返回 ReviewResult
  S->>C: 恢复执行
  C->>C: 生成并执行 SyncPlan
```

`Pull` 的关键点是：

- 默认对应的远端目录是源
- 当前本地目录是目标

## 6. `Push To...` 流程

```mermaid
sequenceDiagram
  participant U as 用户
  participant S as Shell
  participant A as App
  participant T as 远端目录选择
  participant C as Core
  participant R as Review UI

  U->>S: 触发 Push To...
  S->>A: 传入本地路径
  A->>A: 匹配当前同步任务
  A->>T: 读取该任务对应的远端目录树
  T->>U: 展示可选远端目录
  U->>T: 选择目标目录
  T-->>A: 返回选中的远端目录
  A->>C: 发起 Push
  C->>C: 扫描本地与选中远端
  C->>C: 生成 DiffSnapshot
  C-->>S: 请求 review
  S->>R: 打开 review
  R->>U: 展示差异树
  U->>R: 勾选并确认/取消
  R-->>S: 返回 ReviewResult
  S->>C: 恢复执行
  C->>C: 生成并执行 SyncPlan
```

`Push To...` 的关键点是：

- 当前本地目录仍然是源
- 用户需要额外选择远端目标目录

## 7. `Pull From...` 流程

```mermaid
sequenceDiagram
  participant U as 用户
  participant S as Shell
  participant A as App
  participant T as 远端目录选择
  participant C as Core
  participant R as Review UI

  U->>S: 触发 Pull From...
  S->>A: 传入本地路径
  A->>A: 匹配当前同步任务
  A->>T: 读取该任务对应的远端目录树
  T->>U: 展示可选远端目录
  U->>T: 选择来源目录
  T-->>A: 返回选中的远端目录
  A->>C: 发起 Pull
  C->>C: 扫描选中远端与本地
  C->>C: 生成 DiffSnapshot
  C-->>S: 请求 review
  S->>R: 打开 review
  R->>U: 展示差异树
  U->>R: 勾选并确认/取消
  R-->>S: 返回 ReviewResult
  S->>C: 恢复执行
  C->>C: 生成并执行 SyncPlan
```

`Pull From...` 的关键点是：

- 当前本地目录仍然是目标
- 用户需要额外选择远端来源目录

## 8. Review 流程

```mermaid
sequenceDiagram
  participant C as Core
  participant S as Shell
  participant P as Preload
  participant R as Renderer
  participant U as 用户

  C-->>S: 请求 reviewDiff(diffSnapshot)
  S->>R: 创建 review 窗口
  S->>P: 初始化 preload
  P->>R: 暴露 bridge
  S->>R: 传入差异数据
  R->>U: 展示差异树
  U->>R: 勾选并确认/取消
  R-->>S: 返回 ReviewResult
  S-->>C: 恢复后续流程
```

## 9. Apply 流程

```mermaid
sequenceDiagram
  participant C as Core
  participant RC as rclone Process
  participant U as 用户

  C->>C: 根据 ReviewResult 生成 SyncPlan
  C->>C: 先执行 mkdir
  C->>RC: 批量执行 copy
  RC-->>C: 返回 copy 结果
  C->>RC: 批量执行 delete
  RC-->>C: 返回 delete 结果
  C->>C: 再执行 rmdir
  C-->>U: 返回执行结果
```

当前 apply 的执行策略是：

- `copy` / `delete` 优先批量执行
- `mkdir` / `rmdir` 逐目录执行
- `rclone` 调用显式指定配置路径

## 10. 当前阶段限制

当前流程文档只把这些写成已成立事实：

- 右键菜单注册已经接入安装器脚本
- review / progress / result 这条 Electron 链已打通
- 配置默认读取 app data 路径

当前不应写成既成事实的内容：

- 安装器初始化配置文件已经稳定
- 升级安装已经稳定
- 卸载链路已经稳定
