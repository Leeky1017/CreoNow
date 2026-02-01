import{j as r}from"./jsx-runtime-BLchON5X.js";import{C as s}from"./ContextViewer-lK2KqFKr.js";import"./index-kA4PVysc.js";import"./Card-D2dqmnxE.js";import"./Text-CW-Kyc9R.js";import"./contextStore-Cf33-zum.js";import"./index-DDi9LDaq.js";import"./react-Cb9lVK8B.js";const h={title:"Features/ContextViewer",component:s,parameters:{layout:"padded",docs:{description:{component:`ContextViewer 组件 Story

功能：
- 显示 AI 上下文层级（rules/settings/retrieved/immediate）
- 显示 token 预算
- 显示 trim/redaction 证据`}}},tags:["autodocs"]},e={render:()=>r.jsx("div",{style:{width:"320px",height:"400px",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(s,{})})},o={render:()=>r.jsx("div",{style:{width:"280px",height:"400px",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(s,{})})},t={render:()=>r.jsx("div",{style:{width:"480px",height:"600px",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(s,{})})},n={render:()=>r.jsx("div",{style:{width:"320px",height:"100vh",backgroundColor:"var(--color-bg-surface)",overflow:"auto"},children:r.jsx(s,{})})};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: "320px",
    height: "400px",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <ContextViewer />
    </div>
}`,...e.parameters?.docs?.source},description:{story:`默认状态

无上下文时的空状态`,...e.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: "280px",
    height: "400px",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <ContextViewer />
    </div>
}`,...o.parameters?.docs?.source},description:{story:`窄宽度

最小宽度下的布局`,...o.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: "480px",
    height: "600px",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <ContextViewer />
    </div>
}`,...t.parameters?.docs?.source},description:{story:`宽布局

较宽面板下的布局`,...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: "320px",
    height: "100vh",
    backgroundColor: "var(--color-bg-surface)",
    overflow: "auto"
  }}>
      <ContextViewer />
    </div>
}`,...n.parameters?.docs?.source},description:{story:`全高度

完整高度场景`,...n.parameters?.docs?.description}}};const x=["Default","NarrowWidth","WideWidth","FullHeight"];export{e as Default,n as FullHeight,o as NarrowWidth,t as WideWidth,x as __namedExportsOrder,h as default};
