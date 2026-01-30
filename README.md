# CreoNow

AI 驱动的文字创作 IDE（创作者的 Cursor）

## 项目结构

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

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS 4
- **后端**: Electron + TypeScript + SQLite
- **编辑器**: TipTap 2
- **状态管理**: Zustand
- **组件原语**: Radix UI

## 开发

```bash
# 安装依赖
pnpm install

# 类型检查
pnpm typecheck

# Lint
pnpm lint
```

## 规范

- 项目规范：`openspec/specs/creonow-spec/spec.md`
- 设计规范：`design/Variant/DESIGN_SPEC.md`
- Agent 规则：`AGENTS.md`
