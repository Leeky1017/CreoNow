import{j as r}from"./jsx-runtime-BLchON5X.js";import{F as o}from"./FileTreePanel-ObtFQxJU.js";import"./index-kA4PVysc.js";import"./index-DDi9LDaq.js";import"./Button-B9XLIlTV.js";import"./Input-BR80orUP.js";import"./Textarea-C3DI-yW7.js";import"./Card-D2dqmnxE.js";import"./ListItem-CyD6nTsv.js";import"./Text-CW-Kyc9R.js";import"./Heading-BzOyC2Oj.js";import"./Dialog-DJV5UiAm.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-Dx0N0K8E.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-c9SlT_P8.js";import"./index-nu25GvvV.js";import"./Popover-BMinsKFS.js";import"./index-wwK3GREC.js";import"./index-CEv_TvBl.js";import"./Select-DBTPtHXT.js";import"./index-D6SgtPiA.js";import"./index-CAq0tSys.js";import"./index-Tf3TKiO9.js";import"./index-BEZKqDeb.js";import"./Checkbox-Ddw3urWg.js";import"./Tabs-DmRrGnuH.js";import"./index-CDK04lop.js";import"./Badge-0PIbcpDO.js";import"./Avatar-CFHo7YSR.js";import"./Spinner-BG3j59Um.js";import"./Skeleton-CwzwMFJo.js";import"./Tooltip-Ca9CUhYJ.js";import"./Toast-HPSiDIc2.js";import"./Accordion-F8I8yqG1.js";import"./Radio-DYZtN_dz.js";import"./editorStore-ByocGlaq.js";import"./react-Cb9lVK8B.js";import"./fileStore-6FVttjBc.js";const X={title:"Features/FileTreePanel",component:o,parameters:{layout:"padded",docs:{description:{component:`FileTreePanel 组件 Story

功能：
- 显示项目文档列表
- 支持创建/重命名/删除文档
- 显示空状态、加载状态、错误状态`}}},tags:["autodocs"],argTypes:{projectId:{control:"text",description:"Project ID"}}},t={args:{projectId:"project-1"},render:e=>r.jsx("div",{style:{width:"280px",height:"400px",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(o,{...e})})},s={args:{projectId:"empty-project"},render:e=>r.jsx("div",{style:{width:"280px",height:"400px",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(o,{...e})})},n={args:{projectId:"project-1"},render:e=>r.jsx("div",{style:{width:"180px",height:"400px",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(o,{...e})})},a={args:{projectId:"long-names-project"},render:e=>r.jsx("div",{style:{width:"240px",height:"400px",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(o,{...e})})},i={args:{projectId:"project-1"},render:e=>r.jsx("div",{style:{width:"280px",height:"100vh",backgroundColor:"var(--color-bg-surface)"},children:r.jsx(o,{...e})})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    projectId: "project-1"
  },
  render: args => <div style={{
    width: "280px",
    height: "400px",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <FileTreePanel {...args} />
    </div>
}`,...t.parameters?.docs?.source},description:{story:`默认状态

有项目 ID 时的基本状态`,...t.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    projectId: "empty-project"
  },
  render: args => <div style={{
    width: "280px",
    height: "400px",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <FileTreePanel {...args} />
    </div>
}`,...s.parameters?.docs?.source},description:{story:`空状态

无文档时显示提示`,...s.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    projectId: "project-1"
  },
  render: args => <div style={{
    width: "180px",
    height: "400px",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <FileTreePanel {...args} />
    </div>
}`,...n.parameters?.docs?.source},description:{story:`窄宽度

最小宽度下的布局`,...n.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    projectId: "long-names-project"
  },
  render: args => <div style={{
    width: "240px",
    height: "400px",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <FileTreePanel {...args} />
    </div>
}`,...a.parameters?.docs?.source},description:{story:`超长文件名

测试文本溢出处理`,...a.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    projectId: "project-1"
  },
  render: args => <div style={{
    width: "280px",
    height: "100vh",
    backgroundColor: "var(--color-bg-surface)"
  }}>
      <FileTreePanel {...args} />
    </div>
}`,...i.parameters?.docs?.source},description:{story:`全高度

完整高度场景`,...i.parameters?.docs?.description}}};const Y=["Default","Empty","NarrowWidth","LongFileName","FullHeight"];export{t as Default,s as Empty,i as FullHeight,a as LongFileName,n as NarrowWidth,Y as __namedExportsOrder,X as default};
