# 文件组织

## 仓库顶层

```
CreoNow/
├── apps/desktop/           # Electron 桌面应用（monorepo 主包）
├── packages/shared/        # 跨进程共享代码（IPC 类型等）
├── design/                 # 设计资产 & Design Token
├── openspec/               # 项目规范
├── rulebook/               # 任务拆解与执行证据
├── scripts/                # 自动化脚本
├── docs/                   # 文档（产品、交付规则、参考）
├── .github/                # CI/CD 工作流
└── AGENTS.md               # Agent 宪法（本文件入口）
```

## 源码

```
apps/desktop/
├── main/src/               # 后端（Electron 主进程）
│   ├── services/           #   业务服务（Context Engine、KG、Memory 等）
│   ├── dao/                #   数据访问层（SQLite）
│   └── ipc/                #   IPC handler 注册
├── preload/src/            # Preload 脚本（contextBridge）
├── renderer/src/           # 前端（Electron 渲染进程）
│   ├── components/         #   React 组件（L1/L2/L3 分层）
│   ├── stores/             #   Zustand store
│   ├── hooks/              #   React hooks
│   └── pages/              #   页面级组件
└── tests/                  # 集成 / E2E 测试
```

## 组件分层（前端）

| 层级 | 命名       | 说明                                          | 允许的依赖                 |
| ---- | ---------- | --------------------------------------------- | -------------------------- |
| L1   | Primitives | 最小原子组件（Button、Input、Badge、Icon 等） | 仅依赖 Token，不含业务逻辑 |
| L2   | Composites | 由 L1 组合（SearchBar、ToolbarGroup 等）      | L1 组件 + Token            |
| L3   | Features   | 业务级（AIPanel、KnowledgeGraphCard 等）      | L1/L2 + Store + IPC        |

- L1/L2 禁止调用 Zustand Store 或 IPC，只通过 props 接收数据
- L3 采用 Container/Presentational 分离模式

## 测试

```
apps/desktop/**/*.test.ts       # 单元测试（与源文件并置）
tests/
├── integration/                # 集成测试
├── e2e/                        # 端到端测试（Playwright）
└── ai-eval/                    # AI 输出质量测试
    └── golden-tests/           #   Golden Test Set
```

## OpenSpec

```
openspec/
├── project.md                  # 项目概述（Agent 第二入口）
├── specs/                      # 主规范（Source of Truth）
│   └── <module>/spec.md
├── changes/                    # 进行中的变更（Delta Specs）
│   ├── EXECUTION_ORDER.md      # 多活跃 change 的执行顺序（≥2 时必需）
│   ├── _template/              # change 撰写模板
│   └── <change-name>/
│       ├── proposal.md
│       ├── tasks.md
│       └── specs/<module>/spec.md
└── _ops/
    └── task_runs/              # RUN_LOGs
        └── ISSUE-<N>.md
```

## Rulebook

```
rulebook/
└── tasks/
    ├── issue-<N>-<slug>/       # 活跃任务
    └── archive/                # 已归档任务
        └── issue-<N>-<slug>/
```

## 设计

```
design/
├── DESIGN_DECISIONS.md         # 设计决策 SSOT
├── Variant/                    # 设计资产（主题、线框图）
├── system/
│   ├── 01-tokens.css           # Design Token 定义
│   └── 02-component-cards/     # 组件规格卡片
└── reference-implementations/  # 参考实现
```
