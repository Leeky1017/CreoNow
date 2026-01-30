# CreoNow 项目概述

## 定位

AI 驱动的文字创作 IDE（创作者的 Cursor）

## 技术栈

| 层 | 技术 |
|---|---|
| 包管理 | pnpm workspace |
| 前端框架 | React 18 + TypeScript |
| 前端构建 | Vite |
| 状态管理 | Zustand |
| 路由 | React Router |
| 样式 | Tailwind CSS 4 + CSS Variables |
| 组件原语 | Radix UI |
| 编辑器 | TipTap 2 |
| 后端 | Electron + TypeScript |
| 数据库 | SQLite (better-sqlite3) |
| 测试 | Vitest + Playwright |
| CI | GitHub Actions |

## 目录结构

```
CreoNow/
├── apps/desktop/       # Electron 桌面应用
│   ├── main/           # 后端（主进程）
│   └── renderer/       # 前端（渲染进程）
├── packages/shared/    # 共享代码
├── design/Variant/     # 设计资产
├── openspec/           # 项目规范
├── rulebook/           # Rulebook 任务
└── scripts/            # 自动化脚本
```
