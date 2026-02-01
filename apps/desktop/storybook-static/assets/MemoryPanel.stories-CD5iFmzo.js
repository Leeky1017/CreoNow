import{j as r}from"./jsx-runtime-BLchON5X.js";import{M as n}from"./MemoryPanel-DT_fljws.js";import"./index-kA4PVysc.js";import"./index-DDi9LDaq.js";import"./Button-B9XLIlTV.js";import"./Input-BR80orUP.js";import"./Textarea-C3DI-yW7.js";import"./Card-D2dqmnxE.js";import"./ListItem-CyD6nTsv.js";import"./Text-CW-Kyc9R.js";import"./Heading-BzOyC2Oj.js";import"./Dialog-DJV5UiAm.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-Dx0N0K8E.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-c9SlT_P8.js";import"./index-nu25GvvV.js";import"./Popover-BMinsKFS.js";import"./index-wwK3GREC.js";import"./index-CEv_TvBl.js";import"./Select-DBTPtHXT.js";import"./index-D6SgtPiA.js";import"./index-CAq0tSys.js";import"./index-Tf3TKiO9.js";import"./index-BEZKqDeb.js";import"./Checkbox-Ddw3urWg.js";import"./Tabs-DmRrGnuH.js";import"./index-CDK04lop.js";import"./Badge-0PIbcpDO.js";import"./Avatar-CFHo7YSR.js";import"./Spinner-BG3j59Um.js";import"./Skeleton-CwzwMFJo.js";import"./Tooltip-Ca9CUhYJ.js";import"./Toast-HPSiDIc2.js";import"./Accordion-F8I8yqG1.js";import"./Radio-DYZtN_dz.js";import"./projectStore-wjKW615C.js";import"./react-Cb9lVK8B.js";import"./memoryStore-CgfBSG-J.js";const T={title:"Features/MemoryPanel",component:n,parameters:{layout:"padded",docs:{description:{component:`MemoryPanel 组件 Story

功能：
- 记忆 CRUD 操作
- 设置管理（注入/学习/隐私）
- 注入预览`}}},tags:["autodocs"]},o={render:()=>r.jsx("div",{style:{width:"320px",height:"700px",backgroundColor:"var(--color-bg-surface)",overflow:"auto"},children:r.jsx(n,{})})},e={render:()=>r.jsx("div",{style:{width:"280px",height:"700px",backgroundColor:"var(--color-bg-surface)",overflow:"auto"},children:r.jsx(n,{})})},t={render:()=>r.jsx("div",{style:{width:"480px",height:"700px",backgroundColor:"var(--color-bg-surface)",overflow:"auto"},children:r.jsx(n,{})})},i={render:()=>r.jsx("div",{style:{width:"320px",height:"100vh",backgroundColor:"var(--color-bg-surface)",overflow:"auto"},children:r.jsx(n,{})})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: "320px",
    height: "700px",
    backgroundColor: "var(--color-bg-surface)",
    overflow: "auto"
  }}>
      <MemoryPanel />
    </div>
}`,...o.parameters?.docs?.source},description:{story:`默认状态

空闲状态的记忆面板`,...o.parameters?.docs?.description}}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: "280px",
    height: "700px",
    backgroundColor: "var(--color-bg-surface)",
    overflow: "auto"
  }}>
      <MemoryPanel />
    </div>
}`,...e.parameters?.docs?.source},description:{story:`窄宽度

最小宽度下的布局`,...e.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: "480px",
    height: "700px",
    backgroundColor: "var(--color-bg-surface)",
    overflow: "auto"
  }}>
      <MemoryPanel />
    </div>
}`,...t.parameters?.docs?.source},description:{story:`宽布局

较宽面板下的布局`,...t.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    width: "320px",
    height: "100vh",
    backgroundColor: "var(--color-bg-surface)",
    overflow: "auto"
  }}>
      <MemoryPanel />
    </div>
}`,...i.parameters?.docs?.source},description:{story:`全高度

完整高度场景`,...i.parameters?.docs?.description}}};const V=["Default","NarrowWidth","WideWidth","FullHeight"];export{o as Default,i as FullHeight,e as NarrowWidth,t as WideWidth,V as __namedExportsOrder,T as default};
