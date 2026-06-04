# sync-with-rclone 流程图

## 1. 从用户点击到执行完成的总流程

```mermaid
sequenceDiagram
  participant U as 用户
  participant S as Shell
  participant A as App
  participant C as Core
  participant W as Sync Session UI

  U->>S: 触发 Push / Pull / Push To... / Pull From...
  S->>A: 传入动作类型和本地路径
  A->>A: 读取配置并解析本次同步上下文
  A-->>S: emit session.context-resolved
  S->>W: 展示当前同步上下文
  A->>C: 调用 syncCore(...)
  C->>C: 生成 DiffSnapshot
  C-->>S: interaction.reviewDiff(diffSnapshot)
  S->>W: 切换到 review step
  W->>U: 展示差异树
  U->>W: 勾选并确认/取消
  W-->>S: 返回 ReviewResult
  S-->>C: 恢复执行
  C->>C: 生成并执行 SyncPlan
  C-->>A: 返回 SyncCoreResult
  A-->>S: 返回 SyncSessionResult
  S->>W: 按需展示 final acknowledgement
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
  participant W as Sync Session UI

  U->>S: 触发 Push
  S->>A: 传入本地路径
  A->>A: 解析默认远端目标路径
  A->>C: 发起 Push
  C->>C: 扫描本地与远端
  C->>C: 生成 DiffSnapshot
  C-->>S: interaction.reviewDiff(diffSnapshot)
  S->>W: 展示 review step
  W->>U: 展示差异树
  U->>W: 勾选并确认/取消
  W-->>S: 返回 ReviewResult
  S-->>C: 恢复执行
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
  participant W as Sync Session UI

  U->>S: 触发 Pull
  S->>A: 传入本地路径
  A->>A: 解析默认远端来源路径
  A->>C: 发起 Pull
  C->>C: 扫描远端与本地
  C->>C: 生成 DiffSnapshot
  C-->>S: interaction.reviewDiff(diffSnapshot)
  S->>W: 展示 review step
  W->>U: 展示差异树
  U->>W: 勾选并确认/取消
  W-->>S: 返回 ReviewResult
  S-->>C: 恢复执行
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
  participant W as Sync Session UI

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
  C-->>S: interaction.reviewDiff(diffSnapshot)
  S->>W: 展示 review step
  W->>U: 展示差异树
  U->>W: 勾选并确认/取消
  W-->>S: 返回 ReviewResult
  S-->>C: 恢复执行
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
  participant W as Sync Session UI

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
  C-->>S: interaction.reviewDiff(diffSnapshot)
  S->>W: 展示 review step
  W->>U: 展示差异树
  U->>W: 勾选并确认/取消
  W-->>S: 返回 ReviewResult
  S-->>C: 恢复执行
  C->>C: 生成并执行 SyncPlan
```

`Pull From...` 的关键点是：

- 当前本地目录仍然是目标
- 用户需要额外选择远端来源目录

## 8. Review 流程

```mermaid
sequenceDiagram
  participant C as Core
  participant S as Electron Main / CLI
  participant P as Preload
  participant R as Renderer
  participant U as 用户

  C-->>S: interaction.reviewDiff(diffSnapshot)
  S->>R: 更新 sync-session 为 review step
  S->>P: 初始化 preload
  P->>R: 暴露 bridge
  S->>R: 传入差异数据
  R->>U: 展示差异树
  U->>R: 勾选并确认/取消
  R-->>S: invoke confirm/cancel
  S-->>R: 返回 handler 结果
  S-->>S: settle pending review
  S-->>C: 恢复后续流程
```

这一步的职责边界是：

- `syncCore` 只知道它需要一个 `ReviewResult`
- Electron Main 把 `reviewDiff` 适配成 sync-session 窗口里的 review step
- Renderer 负责按钮 pending 和重复点击防护
- Main 以 `pendingReview` 作为是否处于 review 等待点的权威状态

## 9. Apply 流程

```mermaid
sequenceDiagram
  participant C as Core
  participant RC as rclone Process
  participant U as 用户

  C->>C: 根据 ReviewResult 生成 SyncPlan
  C-->>U: emit activity=start
  C->>RC: 批量执行 copy
  RC-->>C: 返回 copy 字节进度
  C-->>U: emit activity=copy + measurement
  RC-->>C: 返回 copy 结果
  C->>RC: 批量执行 delete
  C-->>U: emit activity=delete
  RC-->>C: 返回 delete 结果
  C->>RC: 清理目标端空目录
  C-->>U: emit activity=cleanup
  C-->>U: emit activity=complete
  C-->>U: 返回执行结果
```

当前 apply 的执行策略是：

- `copy` / `delete` 使用 batch file 批量执行
- `delete` 后会执行 `rclone rmdirs <destination-root> --leave-root` 清理目标端空目录
- apply 进度以 `start` / `copy` / `delete` / `cleanup` / `complete` activity 表达
- 只有 `copy` activity 会携带 `measurement` 字节进度
- `rclone` 调用显式指定配置路径

## 10. Session result 与 final acknowledgement 流程

```mermaid
sequenceDiagram
  participant E as Electron Main
  participant A as App
  participant C as Core
  participant R as Renderer

  E->>A: startSync(options, runtime)
  A->>C: syncCore(coreOptions, coreRuntime)
  C-->>A: SyncCoreResult
  A-->>E: SyncSessionResult
  E->>E: 判断是否需要 final acknowledgement
  alt 需要 final acknowledgement
    E->>R: showFinalAcknowledgement(result)
    R-->>E: close acknowledgement
  else 不需要 final acknowledgement
    E->>E: closeWindow()
  end
```

这里的结论是：

- `SyncSessionResult` 是 Electron Main 推进 final 流程和退出码判断的依据
- `SESSION_EVENT.RESULT` 只是观察事件，不作为 final 流程的控制点
- cancelled 是正常运行结果；failed 会导致桌面入口以失败码退出
- review 阶段取消可以直接收尾；进入执行阶段后的取消可按策略展示 final acknowledgement
- cancelled final acknowledgement 会展示已执行操作的汇总，并允许展开查看每个 operation 的执行状态
- failed final acknowledgement 会展示错误信息；只有 `quick-actions.log` 文件实际存在时才展示可打开的日志入口

## 11. 当前阶段限制

当前流程文档只把这些写成已成立事实：

- 右键菜单注册已经接入安装器脚本
- sync-session Electron 链已打通
- 配置默认读取安装目录下的 `config/`
- 打包后的 session argv 会先由 `--session` 进入同步窗口，再按 `--mode`、`--local`、`--remote` 解析，避免额外参数导致位置漂移

当前不应写成既成事实的内容：

- 安装器初始化配置文件已经稳定
- 升级安装已经稳定
- 卸载链路已经稳定
