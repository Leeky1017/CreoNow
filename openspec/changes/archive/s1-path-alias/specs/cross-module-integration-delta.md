# Cross Module Integration Specification Delta

## Change: s1-path-alias

### Requirement: Shared 跨层引用路径契约统一为 `@shared/*` [MODIFIED]

为降低目录层级变动导致的跨模块导入脆弱性，`packages/shared` 的消费路径契约从“允许深层相对路径”收敛为“默认使用 `@shared/*`”。

- `tsconfig.base.json` 必须声明 `@shared/* -> packages/shared/*` 映射，作为三端 TypeScript 解析基线 [ADDED]
- `apps/desktop/main`、`apps/desktop/renderer`、`apps/desktop/preload` 的 tsconfig 必须继承并生效该映射 [ADDED]
- `apps/desktop/electron.vite.config.ts` 必须为 main/renderer/preload 构建入口提供 `@shared` 解析别名 [ADDED]
- 历史 `../../.../packages/shared/...` 深层相对路径导入应完成批量替换，不再作为合规写法 [MODIFIED]

#### Scenario: tsconfig 基线声明并可继承 [ADDED]

- **假设** `tsconfig.base.json` 已定义 `@shared/*` 的 `paths` 映射
- **当** main/renderer/preload 子项目加载各自 tsconfig
- **则** 三个子项目均可解析 `@shared/*` 到 `packages/shared/*`
- **并且** 不因局部 `paths` 覆盖导致 alias 失效

#### Scenario: alias 在 main/renderer/preload 三端构建生效 [ADDED]

- **假设** `electron.vite.config.ts` 已配置 `resolve.alias` 中的 `@shared`
- **当** 分别执行 main、renderer、preload 构建入口解析
- **则** 三端均可正确解析 `@shared` 导入
- **并且** 不出现仅单端可解析的配置漂移

#### Scenario: 深层相对路径替换完成并可验证 [ADDED]

- **假设** 已执行针对 `packages/shared` 导入的批量替换
- **当** 在目标代码范围检索 `../.../packages/shared/` 深层相对路径模式
- **则** 不再出现需要人工维护层级的旧式导入
- **并且** `@shared/...` 成为唯一合规的 shared 导入写法

## Out of Scope

- `packages/shared` 的导出 API 语义调整
- 业务逻辑重构或模块职责拆分
- 与 path alias 无关的 import 风格统一
