# sync-with-rclone 项目入口

这份文档只负责当“总入口”，不再承载全部信息。

如果未来需要快速恢复项目上下文，建议按下面顺序阅读：

1. [产品需求文档](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/PRD.md)
2. [架构设计文档](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/Architecture.md)
3. [交互与运行流程文档](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/Flows.md)
4. [里程碑与开发路线图](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/Roadmap.md)
5. [技术实现说明](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/docs/tech-spec.md)

## 文档分工

- [PRD.md](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/PRD.md)：回答“这个产品为什么存在、给谁用、第一阶段做什么”
- [Architecture.md](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/Architecture.md)：回答“系统应该怎么分层、哪些模块负责什么”
- [Flows.md](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/Flows.md)：回答“用户怎么触发、程序怎么跑、窗口怎么和 Core 交互”
- [Roadmap.md](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/Roadmap.md)：回答“先做什么、后做什么、当前差什么”
- [tech-spec.md](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/docs/tech-spec.md)：回答“已有技术结构、数据结构和实现细节是什么”

## 当前统一结论

- 这是一个面向“项目文件夹”的同步工具，不是通用网盘客户端
- 核心差异点是本地 `.gitignore` 风格过滤
- 同步前必须先看差异，再决定执行什么
- Core 必须能脱离 Electron 独立运行
- Electron 只作为桌面外壳、交互层和安装包入口
- 第一阶段先打通 `Push / Pull -> 差异确认 -> 执行同步`

## 给未来自己或 AI 的阅读建议

如果你是来继续做开发的，优先看：

1. [Architecture.md](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/Architecture.md)
2. [Flows.md](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/Flows.md)
3. [docs/tech-spec.md](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/docs/tech-spec.md)

如果你是来重新理解产品目标的，优先看：

1. [PRD.md](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/PRD.md)
2. [Roadmap.md](/Users/xiaobo/NAS/ProjectsSynced/2025.11.2_sync-with-remote/code/sync-with-rclone/talks/Roadmap.md)
