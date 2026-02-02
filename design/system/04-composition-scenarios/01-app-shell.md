# AppShell 三栏布局组合验收

## 涉及组件

- IconBar (48px 固定宽度)
- Sidebar (180-400px 可拖拽)
- MainContent (flex: 1)
- Panel (280-480px 可拖拽)
- StatusBar (28px 固定高度)
- Resizer (拖拽分隔条)

---

## 布局结构

```
+---------------------------------------------------------------------+
|                        顶部标题栏 (可选，Electron)                    |
+----+----------+---------------------------------+-------------------+
|    |          |                                 |                   |
| I  |  Left    |         Main Content            |   Right Panel     |
| c  |  Sidebar |         (Editor)                |   (AI/Info)       |
| o  |          |                                 |                   |
| n  |  可拖拽   |                                 |   可拖拽           |
|    |  <->     |                                 |   <->             |
| B  |          |                                 |                   |
| a  |          +---------------------------------+                   |
| r  |          |         底部状态栏               |                   |
+----+----------+---------------------------------+-------------------+
```

---

## 验收点

### 布局正确性

- [ ] Icon Bar 宽度固定 48px
- [ ] Status Bar 高度固定 28px
- [ ] 三栏水平排列正确
- [ ] 主内容区 `flex: 1` 自动填充

### 高度约束（关键）

- [ ] 整体布局 `height: 100vh`
- [ ] 主容器 `.main-layout` 设置 `min-height: 0`
- [ ] 各面板设置 `height: 100%` + `overflow-y: auto`
- [ ] 状态栏始终固定底部，不随内容滚动

### 独立滚动

- [ ] 左侧 Sidebar 内容超出时独立滚动
- [ ] 主内容区内容超出时独立滚动
- [ ] 右侧 Panel 内容超出时独立滚动
- [ ] 三个区域滚动互不影响

### 拖拽调整

- [ ] Sidebar 可拖拽调整宽度 (180-400px)
- [ ] Panel 可拖拽调整宽度 (280-480px)
- [ ] 拖拽手柄悬停时 cursor: col-resize
- [ ] 拖拽时实时预览
- [ ] 双击手柄恢复默认宽度

### 面板折叠

- [ ] 点击 Icon Bar 当前图标折叠 Sidebar
- [ ] 折叠后仅保留 Icon Bar (48px)
- [ ] 右侧面板可完全隐藏 (0px)
- [ ] 折叠/展开有动画过渡

### 偏好持久化

- [ ] 面板宽度变化后持久化
- [ ] 折叠状态持久化
- [ ] 刷新后恢复上次状态

---

## CSS 实现要点

```css
/* 整体布局 */
html,
body,
#root {
  height: 100vh;
  overflow: hidden;
}

/* 主容器 */
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* 内容区 */
.main-layout {
  display: flex;
  flex: 1;
  min-height: 0; /* 关键：允许 flex 子元素收缩 */
}

/* 各面板 */
.sidebar,
.main-content,
.right-panel {
  height: 100%;
  overflow-y: auto;
}

/* 状态栏 */
.status-bar {
  height: 28px;
  flex-shrink: 0;
}
```

---

## Story 文件

`components/layout/AppShell/AppShell.stories.tsx`

```typescript
export const Default: Story = {
  render: () => (
    <AppShell>
      <Sidebar>
        <FileTree items={mockFiles} />
      </Sidebar>
      <MainContent>
        <Editor />
      </MainContent>
      <Panel>
        <AIPanel />
      </Panel>
    </AppShell>
  ),
};

export const LongContent: Story = {
  render: () => (
    <AppShell>
      <Sidebar>
        <FileTree items={longMockFiles} /> {/* 100+ 项 */}
      </Sidebar>
      <MainContent>
        <LongDocument /> {/* 长文档 */}
      </MainContent>
      <Panel>
        <LongConversation /> {/* 长对话 */}
      </Panel>
    </AppShell>
  ),
};

export const Collapsed: Story = {
  args: {
    sidebarCollapsed: true,
    panelCollapsed: true,
  },
};
```

---

## 常见陷阱

| 陷阱                 | 检查项                          |
| -------------------- | ------------------------------- |
| 容器高度溢出 (#1)    | 是否设置 `min-height: 0`        |
| Flex 子元素溢出 (#2) | 各面板是否有 `overflow-y: auto` |
| 固定元素被遮挡 (#3)  | Status Bar 是否始终可见         |
| 拖拽分隔条失效 (#4)  | min/max 约束是否生效            |

---

## 验收状态

- [ ] AI 自检通过
- [ ] 用户验收通过
