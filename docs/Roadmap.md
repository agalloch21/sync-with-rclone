# sync-with-rclone 里程碑与开发路线图

## 1. 当前状态

当前仓库已经有的内容：

- 本地扫描原型
- 远端扫描原型
- 差异对比原型
- 初步的数据结构

当前还缺少：

- 稳定的 Core API
- review hook 机制
- Electron 正式结构
- 执行计划
- 真正的同步执行流程
- 安装包与右键菜单集成
- 配置体系

## 2. 开发总原则

顺序上应遵守：

1. 先定边界
2. 再做交互
3. 再做执行
4. 最后做安装与集成

原因很简单：

- 如果边界没定，越写越乱
- 如果过早做安装包，会把错误结构固化

## 3. 里程碑

### Milestone 1：整理 Core 边界

目标：

- `syncCore(options, hooks)` 形态稳定
- 去掉 Core 中对 UI 的直接依赖
- 明确 review hook 输入输出

完成标志：

- Core 可以在没有 Electron 的情况下独立运行

### Milestone 2：差异数据可序列化

目标：

- 把 `diffSnapshot` 转成适合 IPC 和 UI 使用的 JSON 结构
- 明确 summary、tree、entry state 表达方式

完成标志：

- renderer 不需要理解 Core 内部 `Map` 结构

### Milestone 3：Electron 最小可用版

目标：

- Electron main / preload / renderer 跑通
- 可打开差异确认窗口
- 可把选择结果传回主进程

完成标志：

- review 窗口可以真正参与流程，而不是只读展示

### Milestone 4：执行计划与应用

目标：

- 根据用户选择生成 plan
- 调用 `rclone` 完成 copy / mkdir / delete 等操作
- 返回结果摘要

完成标志：

- 完整跑通一次 `Push` 或 `Pull`

### Milestone 5：配置系统

目标：

- 定义 local -> remote 映射配置
- 定义 `rclone` remote 名称和路径
- 定义日志和应用设置

完成标志：

- 不再依赖硬编码路径

### Milestone 6：安装包与右键菜单

目标：

- 打包桌面应用
- 内置 `rclone`
- 注册右键菜单动作

完成标志：

- 用户安装后可从文件夹右键直接发起同步

## 4. 建议编码顺序

推荐按下面顺序实际开始：

1. 重构 `sync-engine.js` 为 hook 化 Core
2. 增加 diff serializer
3. 建立 desktop main / preload / renderer 基础骨架
4. 打通 review 窗口返回结果
5. 实现 sync plan
6. 实现 apply plan
7. 引入配置系统
8. 最后处理安装包和右键菜单

## 5. 风险点

当前最容易踩坑的地方：

- 过早把 Electron 逻辑写进 Core
- 把路径映射写死
- 删除逻辑过于激进
- 把内部结构直接暴露给 UI 当协议
- 还没跑通执行链路就先做平台打包

## 6. 下一步最值得做的事

如果现在继续开发，最值得马上做的是：

1. 明确 `syncCore(options, hooks)` 的签名
2. 定义 `reviewDiff` 的输入输出结构
3. 把 `diffSnapshot` 变成可序列化的 tree 数据

这三步完成后，整个项目会进入真正稳定可扩展的状态。
