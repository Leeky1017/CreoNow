import{j as r}from"./jsx-runtime-BLchON5X.js";import{S as n}from"./SearchPanel-DTZGcJNa.js";import"./index-kA4PVysc.js";import"./Button-B9XLIlTV.js";import"./Card-D2dqmnxE.js";import"./Input-BR80orUP.js";import"./index-DDi9LDaq.js";import"./Text-CW-Kyc9R.js";import"./fileStore-6FVttjBc.js";import"./react-Cb9lVK8B.js";import"./searchStore-Du6yRHsb.js";const v={title:"Features/SearchPanel",component:n,parameters:{layout:"padded",docs:{description:{component:`SearchPanel 组件 Story

功能：
- 全文搜索输入
- 搜索结果列表
- 点击导航到文档`}}},tags:["autodocs"],argTypes:{projectId:{control:"text",description:"Project ID to search within"}}},o={args:{projectId:"project-1"},render:e=>r.jsx("div",{style:{width:"280px",height:"400px",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(n,{...e})})},t={args:{projectId:"project-1"},render:e=>r.jsx("div",{style:{width:"180px",height:"400px",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(n,{...e})})},a={args:{projectId:"project-1"},render:e=>r.jsx("div",{style:{width:"400px",height:"400px",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(n,{...e})})},s={args:{projectId:"project-1"},render:e=>r.jsx("div",{style:{width:"280px",height:"100vh",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(n,{...e})})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    projectId: "project-1"
  },
  render: args => <div style={{
    width: "280px",
    height: "400px",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <SearchPanel {...args} />
    </div>
}`,...o.parameters?.docs?.source},description:{story:`默认状态

空搜索状态`,...o.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    projectId: "project-1"
  },
  render: args => <div style={{
    width: "180px",
    height: "400px",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <SearchPanel {...args} />
    </div>
}`,...t.parameters?.docs?.source},description:{story:`窄宽度

最小宽度下的布局`,...t.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    projectId: "project-1"
  },
  render: args => <div style={{
    width: "400px",
    height: "400px",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <SearchPanel {...args} />
    </div>
}`,...a.parameters?.docs?.source},description:{story:`宽布局

较宽面板下的布局`,...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    projectId: "project-1"
  },
  render: args => <div style={{
    width: "280px",
    height: "100vh",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <SearchPanel {...args} />
    </div>
}`,...s.parameters?.docs?.source},description:{story:`全高度

完整高度场景`,...s.parameters?.docs?.description}}};const b=["Default","NarrowWidth","WideWidth","FullHeight"];export{o as Default,s as FullHeight,t as NarrowWidth,a as WideWidth,b as __namedExportsOrder,v as default};
