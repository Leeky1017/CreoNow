# Editor Specification Delta

## Change: fe-hotkeys-shortcuts-unification

### Requirement: 编辑器相关快捷键必须走统一注册路径 [ADDED]

- 编辑器不得自行散写 `window.addEventListener("keydown")`。
- 保存/AI/格式类快捷键必须通过 HotkeyManager 注册。
