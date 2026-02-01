import{j as t}from"./jsx-runtime-BLchON5X.js";import{fn as a}from"./index-BcR7jcGp.js";import{C as s}from"./CreateProjectDialog-BNioHGUo.js";import"./index-kA4PVysc.js";import"./index-DDi9LDaq.js";import"./Button-B9XLIlTV.js";import"./Dialog-DJV5UiAm.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-Dx0N0K8E.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-c9SlT_P8.js";import"./index-nu25GvvV.js";import"./Input-BR80orUP.js";import"./Text-CW-Kyc9R.js";import"./projectStore-wjKW615C.js";import"./react-Cb9lVK8B.js";const O={title:"Features/CreateProjectDialog",component:s,parameters:{layout:"centered",docs:{description:{component:`CreateProjectDialog 组件 Story

功能：
- 创建项目对话框
- 名称输入
- 表单验证`}}},tags:["autodocs"],argTypes:{open:{control:"boolean",description:"Whether the dialog is open"}},args:{onOpenChange:a()}},r={args:{open:!0}},e={args:{open:!1},render:n=>t.jsxs("div",{style:{padding:"20px",color:"var(--color-fg-muted)",textAlign:"center"},children:[t.jsx(s,{...n}),"Dialog is closed"]})},o={args:{open:!0},render:n=>t.jsx("div",{style:{width:"600px",height:"400px",backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center"},children:t.jsx(s,{...n})})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    open: true
  }
}`,...r.parameters?.docs?.source},description:{story:`打开状态

创建项目对话框打开`,...r.parameters?.docs?.description}}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    open: false
  },
  render: args => <div style={{
    padding: "20px",
    color: "var(--color-fg-muted)",
    textAlign: "center"
  }}>
      <CreateProjectDialog {...args} />
      Dialog is closed
    </div>
}`,...e.parameters?.docs?.source},description:{story:`关闭状态

创建项目对话框关闭`,...e.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    open: true
  },
  render: args => <div style={{
    width: "600px",
    height: "400px",
    backgroundColor: "var(--color-bg-base)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
      <CreateProjectDialog {...args} />
    </div>
}`,...o.parameters?.docs?.source},description:{story:`暗色背景

在暗色背景下的显示效果`,...o.parameters?.docs?.description}}};const S=["Open","Closed","DarkBackground"];export{e as Closed,o as DarkBackground,r as Open,S as __namedExportsOrder,O as default};
