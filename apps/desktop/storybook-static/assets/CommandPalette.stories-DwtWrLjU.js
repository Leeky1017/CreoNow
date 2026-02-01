import{j as e}from"./jsx-runtime-BLchON5X.js";import{fn as a}from"./index-BcR7jcGp.js";import{C as s}from"./CommandPalette-CuS2GWVE.js";import"./index-kA4PVysc.js";import"./index-DDi9LDaq.js";import"./Card-D2dqmnxE.js";import"./ListItem-CyD6nTsv.js";import"./Text-CW-Kyc9R.js";import"./ipcClient-lUJD4lt8.js";import"./editorStore-ByocGlaq.js";import"./react-Cb9lVK8B.js";import"./projectStore-wjKW615C.js";const C={title:"Features/CommandPalette",component:s,parameters:{layout:"centered",docs:{description:{component:`CommandPalette 组件 Story

功能：
- 命令面板弹窗（Cmd/Ctrl+P 触发）
- 命令列表
- 导出 Markdown 等操作`}}},tags:["autodocs"],argTypes:{open:{control:"boolean",description:"Whether the palette is open"}},args:{onOpenChange:a()}},n={args:{open:!0},render:r=>e.jsx("div",{style:{width:"600px",height:"300px",position:"relative"},children:e.jsx(s,{...r})})},t={args:{open:!1},render:r=>e.jsxs("div",{style:{width:"600px",height:"300px",position:"relative"},children:[e.jsx(s,{...r}),e.jsx("div",{style:{padding:"20px",color:"var(--color-fg-muted)",textAlign:"center"},children:"Command palette is closed (nothing rendered)"})]})},o={args:{open:!0},render:r=>e.jsx("div",{style:{width:"800px",height:"400px",position:"relative",backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(s,{...r})})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    open: true
  },
  render: args => <div style={{
    width: "600px",
    height: "300px",
    position: "relative"
  }}>
      <CommandPalette {...args} />
    </div>
}`,...n.parameters?.docs?.source},description:{story:`打开状态

命令面板打开`,...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    open: false
  },
  render: args => <div style={{
    width: "600px",
    height: "300px",
    position: "relative"
  }}>
      <CommandPalette {...args} />
      <div style={{
      padding: "20px",
      color: "var(--color-fg-muted)",
      textAlign: "center"
    }}>
        Command palette is closed (nothing rendered)
      </div>
    </div>
}`,...t.parameters?.docs?.source},description:{story:`关闭状态

命令面板关闭（不渲染）`,...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    open: true
  },
  render: args => <div style={{
    width: "800px",
    height: "400px",
    position: "relative",
    backgroundColor: "var(--color-bg-base)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
      <CommandPalette {...args} />
    </div>
}`,...o.parameters?.docs?.source},description:{story:`暗色背景

在暗色背景下的显示效果`,...o.parameters?.docs?.description}}};const f=["Open","Closed","DarkBackground"];export{t as Closed,o as DarkBackground,n as Open,f as __namedExportsOrder,C as default};
