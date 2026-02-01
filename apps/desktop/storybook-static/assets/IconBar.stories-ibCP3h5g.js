import{j as e}from"./jsx-runtime-BLchON5X.js";import{I as n}from"./IconBar-CiJpXY8B.js";import{l as t}from"./test-utils-Bpb5VK9w.js";import"./index-kA4PVysc.js";import"./kgStore-C8isvze5.js";import"./index-DDi9LDaq.js";import"./react-Cb9lVK8B.js";import"./projectStore-wjKW615C.js";import"./fileStore-6FVttjBc.js";import"./editorStore-ByocGlaq.js";import"./aiStore-C1VK9pLi.js";import"./memoryStore-CgfBSG-J.js";import"./contextStore-Cf33-zum.js";import"./searchStore-Du6yRHsb.js";const h={title:"Layout/IconBar",component:n,parameters:{layout:"fullscreen",docs:{description:{component:`IconBar 组件 Story

设计规范 §5.2: Icon Bar 宽度 48px，图标 24px，点击区域 40x40px。

功能：
- 固定宽度的导航栏
- 侧边栏折叠/展开切换按钮`}}},tags:["autodocs"],decorators:[t]},r={render:()=>e.jsxs("div",{style:{display:"flex",height:"400px"},children:[e.jsx(n,{}),e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Main Content Area"})]})},o={render:()=>e.jsxs("div",{style:{display:"flex",height:"100vh"},children:[e.jsx(n,{}),e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Full Height Layout"})]})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    height: "400px"
  }}>
      <IconBar />
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
    </div>
}`,...r.parameters?.docs?.source},description:{story:`默认状态

固定 48px 宽度的垂直导航栏`,...r.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    display: "flex",
    height: "100vh"
  }}>
      <IconBar />
      <div style={{
      flex: 1,
      backgroundColor: "var(--color-bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--color-fg-muted)",
      fontSize: "14px"
    }}>
        Full Height Layout
      </div>
    </div>
}`,...o.parameters?.docs?.source},description:{story:`完整高度展示

展示 IconBar 在全屏高度下的表现`,...o.parameters?.docs?.description}}};const b=["Default","FullHeight"];export{r as Default,o as FullHeight,b as __namedExportsOrder,h as default};
