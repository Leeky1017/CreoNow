# 架构经验教训

> **前置阅读**：`AGENTS.md`（必读）→ 本文档
> **用途**：架构陷阱与设计原则速查。
> **何时阅读**：设计新模块、重构现有模块、或做架构决策时。

---

## 一、架构健康判定标准

| 维度 | 健康 | 不健康 |
|------|------|--------|
| 模块体积 | 单文件 < 500 行 | God Object > 800 行，职责 ≥ 3 |
| 依赖方向 | 严格单向：renderer → preload → main | 循环依赖、main 反向引用 renderer |
| 错误处理 | 所有错误有结构化错误码 + 用户友好消息 | 静默吞掉错误、`console.error` 后继续 |
| 状态管理 | Store 单一职责，action 可追溯 | 全局可变状态、跨 Store 直接修改 |
| IPC 通道 | 类型安全、有 schema 校验 | 魔法字符串 channel、未校验参数 |

---

## 二、常见架构陷阱

### 陷阱 1：God Object（上帝对象）

| 症状 | 危害 | 解法 |
|------|------|------|
| 单文件 > 800 行 | 改一处牵全身 | 按职责拆分为 service + repository + handler |
| 一个类 / store 做 3+ 件事 | 无法独立测试 | 单一职责原则 |
| 构造函数超过 5 个参数 | 耦合过紧 | 依赖注入 + 接口隔离 |

### 陷阱 2：静默失败（Silent Failure）

| 症状 | 危害 | 解法 |
|------|------|------|
| `try { ... } catch { }` 空 catch | 问题被掩盖 | 至少 log + 上报 |
| `catch(e) { console.error(e) }` 后继续正常流程 | 脏数据流入下游 | 区分可恢复 vs 不可恢复错误 |
| Promise 无 `.catch()` | 静默吞掉异步错误 | 全局 `unhandledrejection` 兜底 |

### 陷阱 3：Token 估算 CJK 偏差

| 症状 | 危害 | 解法 |
|------|------|------|
| 按英文 4 chars/token 估算中文 | 中文实际约 1.5 chars/token，预算偏差 2-3x | 使用 tiktoken 或表驱动权重因子 |
| 上下文窗口溢出 | LLM 截断关键上下文 | 预留 20% 安全边际 |

### 陷阱 4：Preload 层越权

| 症状 | 危害 | 解法 |
|------|------|------|
| Preload 包含业务逻辑 | 安全边界模糊 | Preload 只做 IPC 桥接，零业务逻辑 |
| Preload 直接访问 Node API | 攻击面扩大 | `contextIsolation: true`，只暴露白名单 API |

### 陷阱 5：Ghost UI（幽灵界面）

| 症状 | 危害 | 解法 |
|------|------|------|
| 菜单项/按钮存在但无后端实现 | 用户点击无反应或崩溃 | Stub Detector 自动扫描 |
| UI 提供功能但 Service 返回 mock 数据 | 用户被误导 | Service stub ≠ 可发布 |

---

## 三、控制面设计原则

### 3.1 CI 门禁设计

| 原则 | 说明 |
|------|------|
| **Fail-Closed** | 门禁检测不到 ≠ 通过；无法确定时必须阻断 |
| **Baseline Ratchet** | 警告数只减不增，新增警告自动阻断 |
| **Autofix First** | 能自动修复的不要求手动修；修不了的才阻断 |
| **门禁独立** | 每个门禁独立运行；一个失败不影响其他门禁的反馈 |

### 3.2 门禁优先级排序

| 优先级 | 门禁类型 | 失败影响 |
|--------|---------|---------|
| P0 | 编译/类型检查 | 代码不能运行 |
| P1 | 单元/集成测试 | 行为回归 |
| P2 | Lint / 格式 | 代码质量 |
| P3 | Guard（架构约束） | 架构劣化 |
| P4 | Storybook / 视觉 | 视觉回归 |
| P5 | Bundle size / 资源 | 性能劣化 |

---

## 四、模块分层边界

### 4.1 三层架构

```
┌─────────────────────────────────────────┐
│  Renderer（React + Zustand + TipTap）    │  用户界面
│  apps/desktop/renderer/                  │
├─────────────────────────────────────────┤
│  Preload（IPC 桥接，零业务逻辑）          │  安全边界
│  apps/desktop/preload/                   │
├─────────────────────────────────────────┤
│  Main（Electron 主进程 + Services）       │  业务逻辑
│  apps/desktop/main/                      │
├─────────────────────────────────────────┤
│  Shared（类型定义 + 工具函数）            │  跨进程共享
│  packages/shared/                        │
└─────────────────────────────────────────┘
```

### 4.2 合法调用方向

| 调用方 → 被调用方 | 允许 | 禁止 |
|-------------------|------|------|
| renderer → preload（via contextBridge） | ✅ | |
| preload → main（via ipcRenderer） | ✅ | |
| main → shared | ✅ | |
| renderer → shared | ✅ | |
| main → renderer | ❌ | 主进程不能直接操作 UI |
| renderer → main（跳过 preload） | ❌ | 必须走 IPC |
| preload → renderer | ❌ | Preload 不知道 UI |

### 4.3 IPC 通道设计规范

| 规范 | 说明 |
|------|------|
| Channel 命名 | `module:action` 格式（如 `document:save`） |
| 参数校验 | 主进程 handler 必须校验入参 |
| 返回类型 | 统一 `{ success, data?, error? }` 结构 |
| 错误传递 | 序列化错误码 + 消息，不传递 Error 对象 |
| 类型安全 | TypeScript 类型贯穿 renderer → preload → main |

---

## 五、发布就绪检查单

### 技术就绪

| # | 检查项 | 判定 |
|---|--------|------|
| 1 | 所有 CI 门禁全绿 | Required checks 全部 pass |
| 2 | 无 Service Stub 残留 | `service-stub-detector-gate.ts` 通过 |
| 3 | 无 Ghost UI | 所有 UI 入口有对应后端实现 |
| 4 | 错误处理完整 | 无静默失败、无空 catch |
| 5 | IPC 通道类型安全 | `ipc-handler-validation-gate.ts` 通过 |
| 6 | Bundle size 在预算内 | `bundle-size-budget.ts` 通过 |

### 产品就绪

| # | 检查项 | 判定 |
|---|--------|------|
| 1 | 关键用户路径可走通 | 启动→编辑→保存→AI→导出 |
| 2 | 错误有用户友好消息 | 无裸错误码暴露给用户 |
| 3 | 所有文案 i18n 化 | 无裸字符串 |
| 4 | Dark/Light 主题正常 | 无硬编码颜色 |


