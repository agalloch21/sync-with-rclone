# 错误处理架构

## 1. 目标

这套错误处理方案用于多层调用链中的应用操作，例如：

```text
UI -> IPC -> Electron Main window handler -> app operations -> server/task operations -> rclone/config adapters
```

目标是：

- 内部业务代码保持直接、可读，不在每一层手动传递 `{ success, error }`。
- IPC 边界返回统一、可序列化的结果对象。
- 业务失败和验证失败有稳定 code，UI 根据 locale 展示。
- 非预期错误不会泄露内部细节，但保留可调试上下文。

## 2. 核心规则

内部应用层使用 typed error，IPC 边界统一转换为 operation result。

```text
app/server/task/rclone 层:
  成功时返回正常 value
  预期内失败时 throw AppError
  非预期失败时允许原始 error 抛出

window handler / IPC 边界:
  try/catch app operation
  成功时返回 { success: true, value }
  失败时返回 { success: false, error }
```

不要让每一层函数都返回约定式的 `{ success, error/value }`。这种写法虽然常见，但如果没有清晰契约，会让调用链充满重复判断，并让错误结构逐渐分叉。

## 3. ErrorInfo 契约

错误信息使用一个明确的结构：

```ts
type ErrorInfo = {
  code: string
  message: string
  detail?: string
  fields?: Record<string, string>
  meta?: Record<string, unknown>
}
```

字段含义：

- `code`: `APP_ERROR_CODE` 中的稳定错误码，给程序判断和国际化映射使用。
- `message`: 内部英文摘要和无 UI 环境下的 fallback，不是 renderer 的 locale 地址。
- `detail`: 可选运行时解释；进入 message-box 时会覆盖 locale detail。
- `fields`: 字段级验证错误，key 使用 payload/form 字段路径。
- `meta`: 可序列化上下文，可用于 locale 插值和调试，但不直接作为完整用户文案。

示例：

```js
{
  code: APP_ERROR_CODE.SERVER_VALIDATION_FAILED,
  message: 'Server validation failed.',
  detail: 'Fix the highlighted fields and try again.',
  fields: {
    expectedServerName: 'Server name is required.',
    'protocolFields.host': 'Host is required.',
  },
  meta: {
    operation: 'updateServer',
    serverName: 'synology',
  },
}
```

`meta` 可以替代模糊的 `details` 容器。不要同时使用 `detail` 和 `details`，因为二者太接近，容易误读。

## 4. AppError

应用内只需要一个通用错误类型：

```js
export class AppError extends Error {
  constructor(errorInfo, options = {}) {
    super(errorInfo.message, { cause: options.cause })
    this.name = 'AppError'
    this.code = errorInfo.code
    this.detail = errorInfo.detail
    this.fields = errorInfo.fields
    this.meta = errorInfo.meta
  }
}
```

可以增加一个轻量 helper，让抛错更直接。Helper 使用 `code, message, options` 参数，而不是接收完整 `errorInfo` 对象，这样调用处更容易看出必填信息和可选信息：

```js
export function throwAppError(code, message, options = {}) {
  throw new AppError({
    code,
    message,
    detail: options.detail,
    fields: options.fields,
    meta: options.meta,
  }, {
    cause: options.cause,
  })
}
```

使用示例：

```js
if (!payload.expectedServerName) {
  throwAppError(
    APP_ERROR_CODE.SERVER_VALIDATION_FAILED,
    'Server name is required.',
    {
      fields: {
        expectedServerName: 'Server name is required.',
      },
      meta: {
        operation: 'updateServer',
      },
    },
  )
}
```

## 5. 各层职责

### UI

UI 做即时表单验证，用于提高交互体验：

- 必填字段是否填写。
- 当前协议类型下可见字段是否合法。
- submit 按钮是否可用。
- 字段级错误如何展示。

UI 验证不能作为唯一防线。Renderer 输入仍然要在主进程或 app 层重新验证。

### Preload / IPC Bridge

Preload 只暴露最小 API，并转发可序列化 payload。它不承担业务验证。

### Electron Main window handler

Window handler 是 IPC 边界，负责：

- 接收 renderer payload。
- 调用 app operation。
- 成功后由 app operation 触发配置更新通知。
- 捕获错误并转换成统一 operation result。
- main-managed progress operation 调用 `message-box/operation-presentation.js`；该 Electron adapter 通过 `createOperationReporter()` 组装 `OperationReportState`，再调用 message-box 的 `open` / `update` / `close` interface 展示进度及最终错误。
- 普通 operation 把 `OperationResult` 返回 renderer，由 renderer facade 决定是否展示。

示例：

```js
async function updateServerHandler(_event, payload) {
  try {
    const value = await updateServer(payload)
    return toSuccessfulResult(value)
  }
  catch (error) {
    return toFailureResult(error)
  }
}
```

### App operations

App operation 负责用户意图和跨资源编排，例如：

- `createServer(payload)`
- `updateServer(payload)`
- server rename 后同步更新 task 引用。
- 判断 create/update 的流程是否合法。
- 将业务失败抛为 `AppError`。

App operation 不应该返回 `{ success, error }` 给内部调用者；它成功时返回正常值，失败时抛错。

### Server / Task operations

这些层负责资源级操作：

- server operation 处理 server connection 的创建、更新、测试、删除。
- task operation 处理 `config.json` 中 task 的增删改和引用维护。
- 发现预期内失败时抛 `AppError`。

如果 server operation 内部需要调用 rclone，它可以隐藏 rclone/remote 术语，对上层暴露 app 语言，例如 `createServerConnection`、`updateServerConnection`。

### rclone / config adapters

Adapter 层负责接近外部系统或文件格式的校验与错误转换：

- rclone remote 是否存在。
- rclone remote 名称是否冲突。
- rclone 命令失败。
- config 文件解析失败或写入失败。

外部系统返回的错误可以包装成 `AppError`，并把调试信息放进 `meta`。不要把密码、token、private key 或完整连接凭据放入 `meta`。

## 6. IPC OperationResult

IPC 最终返回统一结果：

```ts
type OperationResult<T = unknown> =
  | { success: true; value?: T }
  | { success: false; error: ErrorInfo }
```

转换函数示例：

```js
export function toFailureResult(error) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        detail: error.detail,
        fields: error.fields,
        meta: error.meta,
      },
    }
  }

  return {
    success: false,
    error: {
      code: error?.code ?? 'unexpected_error',
      message: error?.message ?? 'Something went wrong.',
      detail: error?.detail ?? '',
    },
  }
}
```

`toFailureResult()` 只负责序列化 IPC 结果，不决定 warning/error level，也不生成 locale key。展示策略属于 message facade：

```text
useMessageBox.error(error)
  -> mode=message
  -> level=error
  -> key=errors.${error.code || APP_ERROR_CODE.UNKNOWN}
  -> params=error.meta
  -> detail=fields/detail/message
```

当前不使用 `expected` 属性区分图标。`AppError` 和 unexpected error 都使用 error level；二者的差别保留在 code、内部 message、detail、fields 和 meta 中。

## 7. 错误文案与 locale

Error code 不直接等于显示文案。Renderer 只在 message-box presentation 层翻译：

```text
errors.${APP_ERROR_CODE value}
```

locale 使用 canonical constant 定义文案：

```js
errors: defineLocaleTree({
  [APP_ERROR_CODE.SERVER_ALREADY_EXISTS]: 'Server already exists.',
})
```

这样 code 与 locale entry 共用同一个常量，不需要维护额外的 error-code-to-translation-key mapping。`defineLocaleTree()` 只在 locale module import 时把 dotted code 展开成 nested object；它不负责翻译。

找不到具体 error key 时，message-box 使用通用 fallback，不把缺失 key 原样展示给用户。业务 error translations 按 domain/infrastructure ownership 存放，不放进 message-box surface locale。

## 8. Error stack、cause 与包装规则

JavaScript `Error` 的内置结构可以理解为：

```text
Error
  name      // 错误类型名称，例如 Error、TypeError、AppError
  message   // 人类可读的简短错误描述
  stack     // 创建错误时的函数调用链快照
  cause     // 导致当前错误的底层 error，可选
```

`stack` 由运行时自动生成。在 Node/Electron 中，终端里常见的调用链：

```text
Error: failed
  at c
  at b
  at a
```

就是 `error.stack` 的内容。它用于定位技术调用路径，但它不是完整业务执行历史。错误创建之后，后续的 catch、rethrow、IPC 转换不会自动追加到 `stack` 里。

### constructor 与 super

自定义错误继承 `Error` 时，必须先调用 `super()`，因为子类 constructor 中的 `this` 只有在父类 constructor 执行后才可用。

```js
class AppError extends Error {
  constructor(errorInfo, options = {}) {
    super(errorInfo.message, { cause: options.cause })

    this.name = 'AppError'
    this.code = errorInfo.code
    this.meta = errorInfo.meta
  }
}
```

`message` 和 `cause` 通过 `super()` 传入，因为它们属于内置 `Error` constructor 的输入。`name`、`code`、`detail`、`fields`、`meta` 需要用 `this` 手动赋值，因为它们不是 `Error` constructor 的通用输入。

`super(message, { cause })` 不会合并或复制底层错误的属性。它会创建当前错误自己的 `message` 和 `stack`，并把底层错误对象按引用保存在 `error.cause`。

### throw 与 catch

抛出同一个错误对象不会创建新 stack：

```js
catch (error) {
  throw error
}
```

抛出新错误会创建新 stack：

```js
catch (error) {
  throw new Error('Update failed')
}
```

如果创建新错误但不保留 `cause`，底层错误的调试位置会丢失。包装错误时必须保留 cause：

```js
catch (error) {
  throwAppError(
    APP_ERROR_CODE.SERVER_OPERATION_FAILED,
    'Failed to update server.',
    {
      cause: error,
      meta: {
        operation: 'updateServer',
        step: 'renameServer',
      },
    },
  )
}
```

包装规则：

- 不要为了换一个说法而包装错误。
- 只有跨越抽象边界或补充有价值的工作流上下文时才包装。
- 包装时必须通过 `cause` 保留原始错误。
- 技术定位依赖 `stack`，业务上下文放入 `meta`。
- IPC 边界捕获错误后，如果手动序列化，需要主动决定是否包含 `meta`、`stack`、`cause` 摘要。

## 9. Server create/update 示例

Renderer 可以使用统一 payload 形状调用两个不同 IPC 方法：

```js
const payload = {
  serverName: currentServerName.value,
  expectedServerName: expectedServerName.value,
  protocolType: protocolType.value,
  protocolFields: protocolForm.value,
}

return mode.value === EDIT_MODE.UPDATE
  ? window.syncTaskModal?.updateServer?.(payload)
  : window.syncTaskModal?.createServer?.(payload)
```

推荐职责分布：

```text
window.js
  createServerHandler(payload)
  updateServerHandler(payload)

message-box/operation-presentation.js
  runReportedOperation(operation, execute)
  reportRequestError(error)

app-api.js
  createServer(payload)
  updateServer(payload)

server-operations.js
  createServerConnection(...)
  updateServerConnection(...)

task-operations.js
  updateTaskServerReferences(...)

infrastructure/rclone/remote-config.js
  createRemoteConfig(...)
  updateRemoteConfig(...)
```

`createServer` 和 `updateServer` 属于 app operation。它们表达用户意图和完整工作流，并在成功后通过 `events/configuration-events.js` 发布配置更新。

`createServerConnection` 和 `updateServerConnection` 属于 server operation。它们表达完整的 server use case，负责验证、资源存在规则和错误转换，并隐藏 raw rclone remote 细节。`remote-config.js` 只执行底层 rclone config 命令。

## 10. 什么时候返回 result，什么时候 throw

使用这个判断：

- 函数是 IPC handler 或公开给 renderer 的 API：返回 `OperationResult`。
- 函数是内部 app/server/task/config 操作：成功返回 value，失败 throw。
- 失败是用户输入、业务规则、资源状态导致的预期失败：throw `AppError`。
- 失败是 bug、系统异常、未知外部异常：允许原始错误抛出，在 IPC 边界统一转成 unknown。

这样可以避免每一层都记住“我要返回 OperationResult”，同时保证 UI 收到稳定结构。

## 11. 错误码命名

错误码由 `src/app/app-errors.js` 的 `APP_ERROR_CODE` 集中声明，使用稳定、可读的点分 snake_case：

```text
server.already_exists
server.not_found
server.validation_failed
config.load_failed
rclone.unsupported_protocol
rclone.command_failed
unknown
```

规则：

- 错误码是程序契约，不要频繁改名。
- 调用方使用 `APP_ERROR_CODE` constant，不手写正式错误码。
- 文案可以改，错误码尽量不改。
- 点分 segment 表达 domain namespace；segment 内使用 snake_case。
- 字段级错误放在 `fields`，不要为每个字段都创建一个顶层错误类型。
- 多字段验证失败时，使用一个 summary code，例如 `server.validation_failed`。
- UI validation/confirmation message 使用独立的 `APP_MESSAGE_CODE`，不伪装成 `AppError`。

## 12. 安全注意事项

`meta` 是调试信息，不是秘密保险箱。

不要放入：

- 密码。
- token。
- private key。
- 完整连接凭据。
- 用户不应在日志或 IPC 中看到的敏感路径。

可以放入：

- operation 名称。
- server name。
- config path。
- protocol type。
- 外部命令退出码。
- 已清理过的错误摘要。
