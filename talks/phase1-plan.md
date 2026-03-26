# Phase 1: Snapshot Scanner Implementation Plan

## Summary
先只实现“扫描本地目录并产出标准化 `Snapshot`”这一段，不接入 ignore、diff、rclone。第一阶段完成后，你应该能从 CLI 触发扫描，并且用自动化测试验证 `Snapshot` 结构、路径格式、文件/目录识别、`byPath` 索引都正确。

本阶段推荐目录结构：

```text
src/
  index.js
  core/
    sync-engine.js
  types/
    snapshot.js
  modules/
    scan/
      build-snapshot.js
test/
  fixtures/
    scan-basic/
  unit/
    types/
      snapshot.test.js
    modules/
      scan/
        build-snapshot.test.js
```

## Key Changes
### Shared type definition
在 `src/types/snapshot.js` 中只定义共享结构，不写业务逻辑。
包含这些类型：
- `FileEntry`
- `DirEntry`
- `Entry`
- `Snapshot`

文件只做类型声明，末尾保留 `module.exports = {}`，让其它模块能通过 `import('../types/snapshot').Snapshot` 这类写法引用。

### Scanner module
在 `src/modules/scan/build-snapshot.js` 中实现第一阶段唯一核心函数：

```js
async function buildSnapshot(rootDir) -> Promise<Snapshot>
```

行为约定：
- 输入一个根目录绝对路径或相对路径
- 递归扫描目录下所有文件和子目录
- 返回 `Snapshot`
- `entries` 中每个条目的 `path` 必须是“相对于 rootDir 的相对路径”
- 根目录自己不作为 entry 放进 `entries`
- 目录条目使用 `type: 'dir'`
- 文件条目使用 `type: 'file'`，并包含 `size` 和 `mtimeMs`
- `byPath` 必须覆盖 `entries` 中全部条目，键为同一个相对路径字符串

第一阶段先不要做：
- `.gitignore`
- 过滤规则
- diff
- 调 rclone
- 符号链接、权限、哈希值、冲突处理

### Engine and CLI
保留 `src/core/sync-engine.js`，但第一阶段把它收缩成很薄的编排层：
- 调用 `buildSnapshot(srcFolder)`
- 暂时把结果返回，或 `console.log` 一个简化摘要供人工观察

`src/index.js` 继续保留为 CLI 入口：
- 读取命令行参数
- 调用 `syncCore`
- 只作为手动冒烟验证入口，不作为主要测试手段

## Test Plan
### Test 1: shared type usage smoke test
目标：确认 `snapshot.js` 作为共享类型文件的引用方式稳定。
做法：
- 在 `test/unit/types/snapshot.test.js` 中创建一个符合 `Snapshot` 结构的对象样本
- 用最简单断言验证对象字段形状
- 重点不是运行时类型检查，而是让你练习“其它模块如何按这个结构组织数据”

### Test 2: empty directory snapshot
夹具目录：`test/fixtures/scan-basic/empty/`
断言：
- `snapshot.root` 正确
- `snapshot.entries.length === 0`
- `snapshot.byPath.size === 0`

### Test 3: nested files and directories
夹具目录包含：
- 一个顶层文件
- 一个子目录
- 子目录里的文件

断言：
- `entries` 同时包含文件和目录
- 相对路径格式统一
- 目录和文件类型正确
- 文件条目带 `size`、`mtimeMs`
- `byPath.get(path)` 能正确取回条目

### Test 4: root directory excluded
断言：
- `entries` 里不出现 `'.'`、空字符串或根目录绝对路径
- 只记录根目录内部成员

### Test 5: deterministic assertions
不要直接断言整个对象的完整深比较，优先断言：
- 是否包含关键路径
- 路径是否相对
- `type` 是否正确
- 文件条目字段是否存在且为数字
这样可以减少不同系统时间精度造成的脆弱测试。

## Implementation Order
1. 创建 `package.json`
- 先只加最小内容
- `scripts.test = "node --test"`
- 不引入 Jest/Vitest

2. 创建 `src/types/snapshot.js`
- 写完整 JSDoc typedef
- 暂时不放任何函数
- 末尾加 `module.exports = {}`

3. 写 `test/unit/types/snapshot.test.js`
- 先练习如何在测试文件里引用 `Snapshot` / `Entry` 类型
- 用一个手写样本对象确认你的数据结构理解一致

4. 创建扫描测试夹具目录
- 准备一个空目录样本
- 准备一个嵌套目录样本
- 文件数量保持很少，便于你目测结果

5. 写 `test/unit/modules/scan/build-snapshot.test.js`
- 先写空目录测试
- 再写嵌套目录测试
- 先让测试失败

6. 实现 `src/modules/scan/build-snapshot.js`
- 用 Node 原生 `fs/promises` 和 `path`
- 递归读取目录
- 生成 `entries`
- 最后组装 `byPath`

7. 收缩 `src/core/sync-engine.js`
- 第一阶段只调用 `buildSnapshot`
- 返回 snapshot 或打印摘要
- 不写后续伪流程

8. 保留 `src/index.js` 作为手动入口
- 用一个本地测试目录运行一次
- 人工确认输出和测试结果一致

## Public Interfaces
第一阶段只固定一个共享结构和一个模块接口：

```js
// src/types/snapshot.js
FileEntry
DirEntry
Entry
Snapshot
```

```js
// src/modules/scan/build-snapshot.js
buildSnapshot(rootDir): Promise<Snapshot>
```

```js
// src/core/sync-engine.js
syncCore({ srcFolder }): Promise<Snapshot>
```

## Assumptions
- 当前项目继续使用 CommonJS
- 当前阶段全部使用 JavaScript + JSDoc
- 路径统一使用相对 `rootDir` 的相对路径
- 第一阶段默认只支持普通文件和普通目录
- 第一阶段测试主要依赖 `node:test`
- 第一阶段不处理 Windows/Unix 路径差异的高级兼容问题，只要求当前环境下稳定工作
