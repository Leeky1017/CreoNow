> 本文件是 gates-design 的一部分，完整索引见 [docs/references/gates-design/README.md](README.md)

# 依赖方向检查规则

以下是必须检查的依赖方向违规（当前已生效的规则 + 目标规则，自动化检测为计划实现）：

---

## 规则清单

| 违规类型 | 检测规则 | 严重级 | 状态 |
| --- | --- | --- | --- |
| Renderer import Main | apps/desktop/renderer/ 不能 import apps/desktop/main/ | 阻止合并 | ✅ 当前已生效（架构隔离） |
| DB import Service | db/ 不能 import services/ | 阻止合并 | ✅ 当前已生效（架构隔离） |
| IPC 直调 Service | ipc/ 只能 import core/commandDispatcher（计划实现，当前 IPC handler 直调 Service） | 阻止合并 | 🔲 目标规则 |
| Service import CommandDispatcher | services/ 不能 import core/commandDispatcher（计划实现，commandDispatcher 尚未存在） | 阻止合并 | 🔲 目标规则 |
| Shared import 业务层 | packages/shared/ 不能 import apps/ | 阻止合并 | ✅ 当前已生效（架构隔离） |

> **当前状态**：已生效的规则通过 TypeScript 模块解析的天然隔离（不同 tsconfig）实现，而非 dependency-cruiser。`.dependency-cruiser.cjs` 配置文件尚未创建。

---

## dependency-cruiser 配置（计划实现）

```js
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    {
      name: 'renderer-no-main',
      severity: 'error',
      from: { path: 'apps/desktop/renderer' },
      to: { path: 'apps/desktop/main' }
    },
    {
      name: 'db-no-services',
      severity: 'error',
      from: { path: 'apps/desktop/main/src/db' },
      to: { path: 'apps/desktop/main/src/services' }
    },
    {
      name: 'ipc-only-dispatcher',
      severity: 'error',
      from: { path: 'apps/desktop/main/src/ipc' },
      to: {
        path: 'apps/desktop/main/src/services',
        pathNot: 'apps/desktop/main/src/core/commandDispatcher'
      }
    },
    {
      name: 'shared-no-apps',
      severity: 'error',
      from: { path: 'packages/shared' },
      to: { path: 'apps/' }
    }
  ]
}
```
