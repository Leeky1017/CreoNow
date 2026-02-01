# 快捷键规范

> **来源**: DESIGN_DECISIONS.md §10  
> **用途**: 统一快捷键定义，避免冲突

---

## 全局快捷键 (MUST)

| 功能 | Mac | Windows | 说明 |
|------|-----|---------|------|
| 命令面板 | Cmd+P | Ctrl+P | 搜索文件和命令 |
| AI 面板 | Cmd+L | Ctrl+L | 打开/关闭 AI 面板 |
| 左侧边栏 | `Cmd+\` | `Ctrl+\` | 折叠/展开左侧边栏 |
| 禅模式 | F11 | F11 | 全屏专注写作 |
| 设置 | Cmd+, | Ctrl+, | 打开设置 |
| 新建文件 | Cmd+N | Ctrl+N | 新建文件 |
| 新建项目 | Cmd+Shift+N | Ctrl+Shift+N | 新建项目 |
| 保存 | Cmd+S | Ctrl+S | 手动保存 |

**注意**: `Cmd/Ctrl+B` MUST 保留给编辑器加粗；侧边栏折叠使用 `Cmd/Ctrl+\` 避免快捷键冲突

---

## 编辑器快捷键 (MUST)

| 功能 | Mac | Windows |
|------|-----|---------|
| 当前搜索 | Cmd+F | Ctrl+F |
| 全局搜索 | Cmd+Shift+F | Ctrl+Shift+F |
| 加粗 | Cmd+B | Ctrl+B |
| 斜体 | Cmd+I | Ctrl+I |
| 撤销 | Cmd+Z | Ctrl+Z |
| 重做 | Cmd+Shift+Z | Ctrl+Y |
| 标题 1 | Cmd+1 | Ctrl+1 |
| 标题 2 | Cmd+2 | Ctrl+2 |
| 标题 3 | Cmd+3 | Ctrl+3 |

---

## 键盘导航 (MUST)

| 按键 | 行为 |
|------|------|
| Tab | 移动焦点到下一个元素 |
| Shift+Tab | 移动焦点到上一个元素 |
| Enter | 激活当前元素 |
| Space | 激活按钮/切换复选框 |
| Escape | 关闭弹窗/取消操作 |
| Arrow Up/Down | 列表中移动选择 |
| Arrow Left/Right | 树形结构展开/折叠 |

---

## 快捷键冲突避免规则

1. **编辑器优先**: 编辑器内的格式化快捷键（Cmd+B/I/U）优先于全局快捷键
2. **不覆盖系统**: 不使用系统级快捷键（如 Cmd+Q, Cmd+W）
3. **一致性**: Mac 用 Cmd，Windows 用 Ctrl，保持一致映射
4. **可发现性**: 所有快捷键在命令面板中可见

---

## 实现注意事项

```typescript
// 检测平台
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? 'metaKey' : 'ctrlKey';

// 快捷键处理示例
function handleKeyDown(e: KeyboardEvent) {
  if (e[modKey] && e.key === 'l') {
    e.preventDefault();
    toggleAIPanel();
  }
}

// 避免在输入框中触发全局快捷键
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || 
         target.getAttribute('contenteditable') === 'true';
}
```
