import{j as e}from"./jsx-runtime-BLchON5X.js";import{S as o}from"./StatusBar-oJ08nY3g.js";import{l as n}from"./test-utils-Bpb5VK9w.js";import"./index-kA4PVysc.js";import"./kgStore-C8isvze5.js";import"./index-DDi9LDaq.js";import"./react-Cb9lVK8B.js";import"./editorStore-ByocGlaq.js";import"./projectStore-wjKW615C.js";import"./fileStore-6FVttjBc.js";import"./aiStore-C1VK9pLi.js";import"./memoryStore-CgfBSG-J.js";import"./contextStore-Cf33-zum.js";import"./searchStore-Du6yRHsb.js";const S={title:"Layout/StatusBar",component:o,parameters:{layout:"fullscreen",docs:{description:{component:`StatusBar 组件 Story

设计规范 §5.4: Status bar 高度 28px。

功能：
- 固定高度的底部状态栏
- 显示自动保存状态`}}},tags:["autodocs"],decorators:[n]},r={render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"300px"},children:[e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Main Content Area"}),e.jsx(o,{})]})},t={render:()=>e.jsx("div",{style:{width:"100%"},children:e.jsx(o,{})})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    height: "300px"
  }}>
      <div style={{
      flex: 1,
      backgroundColor: "var(--color-bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--color-fg-muted)",
      fontSize: "14px"
    }}>
        Main Content Area
      </div>
      <StatusBar />
    </div>
}`,...r.parameters?.docs?.source},description:{story:`默认状态

固定 28px 高度的底部状态栏`,...r.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: "100%"
  }}>
      <StatusBar />
    </div>
}`,...t.parameters?.docs?.source},description:{story:`完整宽度展示

StatusBar 在全宽布局下的表现`,...t.parameters?.docs?.description}}};const h=["Default","FullWidth"];export{r as Default,t as FullWidth,h as __namedExportsOrder,S as default};
