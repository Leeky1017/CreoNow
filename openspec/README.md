# CreoNow OpenSpec

本目录存放项目行为规范（Source of Truth）、变更提案和执行证据。

## 目录结构

```
openspec/
├── project.md              ← 项目概述（Agent 第二入口）
├── specs/                  ← 按模块组织的主规范（12 个模块）
│   ├── context-engine/
│   ├── knowledge-graph/
│   ├── memory-system/
│   ├── skill-system/
│   ├── ai-service/
│   ├── search-and-retrieval/
│   ├── editor/
│   ├── workbench/
│   ├── document-management/
│   ├── project-management/
│   ├── ipc/
│   └── version-control/
├── changes/                ← 进行中的变更（Delta Specs）
└── _ops/
    └── task_runs/          ← RUN_LOGs（执行证据）
```

## 入口

- Agent 宪法：`/AGENTS.md`
- 项目概述：`project.md`
- 交付规则：`/docs/delivery-skill.md`
