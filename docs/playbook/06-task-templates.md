# Issue / 任务模板

> 发任务时复制对应模板，填入具体内容。

## 模板 A：后端功能任务

```
### 任务概述
[一句话描述]

### Spec 引用
- 模块：`openspec/specs/<module>/spec.md`
- 相关 Scenario：[Scenario 名称]

### 实现位置
- Service：`apps/desktop/main/src/services/<module>/`
- IPC：`apps/desktop/main/src/ipc/<handler>.ts`
- 测试：`apps/desktop/tests/<type>/<module>.test.ts`

### INV 合规
- [ ] INV-1 原稿保护：[涉及/不涉及]
- [ ] INV-2 并发安全：[涉及/不涉及]
- [ ] INV-3 CJK Token：[涉及/不涉及]
- [ ] INV-4 Memory-First：[涉及/不涉及]
- [ ] INV-5 叙事压缩：[涉及/不涉及]
- [ ] INV-6 一切皆 Skill：[涉及/不涉及]
- [ ] INV-7 统一入口：[涉及/不涉及]
- [ ] INV-8 Hook 链：[涉及/不涉及]
- [ ] INV-9 成本追踪：[涉及/不涉及]
- [ ] INV-10 错误不丢上下文：[涉及/不涉及]

### 验收标准
- [ ] 功能正常
- [ ] 测试覆盖（Red → Green → Refactor）
- [ ] TypeScript strict 无 any
- [ ] CI 全绿
```

## 模板 B：前端页面任务

```
### 任务概述
[一句话描述]

### 黄金设计源
- 文件：`figma_design/前端完整参考/src/app/components/<file>.tsx`
- Figma：[如有 Figma 链接]

### 实现位置
- 页面：`apps/desktop/renderer/src/features/<module>/`
- Story：`apps/desktop/renderer/src/stories/<module>.stories.tsx`

### 前端约束
- [ ] 颜色走 Token（`--cn-*`）
- [ ] 文本走 `t()` i18n
- [ ] 新组件有 Storybook Story
- [ ] 动效 Framer Motion（80/120/300ms）
- [ ] 亮色 + 暗色双主题
- [ ] 已检查 primitives/composites 复用

### 验收标准
- [ ] 与黄金源视觉对齐
- [ ] Storybook 可构建
- [ ] PR 正文嵌入截图
- [ ] 交互状态有过渡动画
```

## 模板 C：成瘾/热爱引擎任务

```
### 任务概述
[一句话描述]

### 产品引用
- 成瘾引擎规范：`docs/references/engagement-engine.md` §[章节号]
- 对应机制/维度：[机制 N · 名称] / [维度 N · 名称]

### 实现位置
- Service：`services/engagement/<service>.ts`
- Skill（如有 LLM 调用）：`SKILL.md` frontmatter + Skill 注册
- 前端：`renderer/src/features/<module>/`

### 约束
- [ ] 查询类 ≤ 200ms（纯 SQLite + KG，禁止 LLM）
- [ ] LLM 调用注册为 INV-6 Skill
- [ ] UI 通知融入 Dashboard/边栏/Toast（禁止弹窗）
- [ ] INV-8 Hook 触发（如适用）
- [ ] INV-9 成本追踪（如有 LLM）
- [ ] 分析 Skill 失败降级处理（INV-10）

### 验收标准
- [ ] 功能正常 + 性能达标
- [ ] 不打断写作心流
- [ ] 测试覆盖
```

## 模板 D：CI 修复任务

```
### 任务概述
修复 [CI job / gate 名称] 的失败

### 失败信息
[粘贴 CI 输出]

### 相关文件
- Gate 脚本：`scripts/<gate>.ts`
- 测试命令：`docs/references/test-commands.md`

### 约束
- [ ] 禁止删除/跳过测试换取 CI 通过
- [ ] 禁止 CRLF/LF 噪音型大 diff
- [ ] 修复后 CI 全绿

### 验收标准
- [ ] CI 全绿
- [ ] 修复不引入新问题
```
