# ISSUE-81

- Issue: #81
- Branch: task/81-design-system-docs
- PR: https://github.com/Leeky1017/CreoNow/pull/82

## Plan

1. 创建 `design/system/` 目录结构，拆分 DESIGN_DECISIONS.md
2. 创建组件生成卡片（Button/Input/Card）
3. 创建组合场景验收文档

## Runs

### 2026-02-01 20:44 Initial implementation

- Command: 手动创建文件结构
- Key output: 14 个文件，2523 行
- Evidence: `design/system/`, `design/reference-implementations/`

**创建的文件清单**:

```
design/system/
├── README.md                              # 目录说明
├── 00-ROADMAP.md                          # 执行路线图 + 验收清单
├── 01-tokens.css                          # Design Tokens（364 行）
├── 02-component-cards/
│   ├── README.md
│   ├── Button.md                          # 224 行
│   ├── Input.md                           # 207 行
│   └── Card.md                            # 222 行
├── 03-state-inventory.md                  # 状态清单 + 36项陷阱（226 行）
├── 04-composition-scenarios/
│   ├── README.md
│   ├── 01-app-shell.md                    # 173 行
│   └── 02-file-tree.md                    # 141 行
├── 05-design-mapping.md                   # 设计稿映射 + UI清单（191 行）
└── 06-shortcuts.md                        # 快捷键规范
design/reference-implementations/
└── README.md
```

**从 DESIGN_DECISIONS.md 提取的内容**:

- §3 Design Tokens → `01-tokens.css`
- §4.2 Typography 映射表 → `01-tokens.css`
- §7.4 滚动条样式 → `01-tokens.css`
- §2.1 固定尺寸 → `01-tokens.css`
- §6 组件规范 → `02-component-cards/*.md`
- §12 状态显示 → `03-state-inventory.md`
- §10 快捷键规范 → `06-shortcuts.md`
- §15 设计稿清单 → `05-design-mapping.md`
- 方法论附录 36 项陷阱 → `03-state-inventory.md`
