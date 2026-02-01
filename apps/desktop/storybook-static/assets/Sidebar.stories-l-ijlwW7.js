import{j as e}from"./jsx-runtime-BLchON5X.js";import{S as t}from"./Sidebar-DVJZa7VQ.js";import{l}from"./test-utils-Bpb5VK9w.js";import{d}from"./kgStore-C8isvze5.js";import"./index-kA4PVysc.js";import"./index-DDi9LDaq.js";import"./FileTreePanel-ObtFQxJU.js";import"./Button-B9XLIlTV.js";import"./Input-BR80orUP.js";import"./Textarea-C3DI-yW7.js";import"./Card-D2dqmnxE.js";import"./ListItem-CyD6nTsv.js";import"./Text-CW-Kyc9R.js";import"./Heading-BzOyC2Oj.js";import"./Dialog-DJV5UiAm.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-Dx0N0K8E.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-c9SlT_P8.js";import"./index-nu25GvvV.js";import"./Popover-BMinsKFS.js";import"./index-wwK3GREC.js";import"./index-CEv_TvBl.js";import"./Select-DBTPtHXT.js";import"./index-D6SgtPiA.js";import"./index-CAq0tSys.js";import"./index-Tf3TKiO9.js";import"./index-BEZKqDeb.js";import"./Checkbox-Ddw3urWg.js";import"./Tabs-DmRrGnuH.js";import"./index-CDK04lop.js";import"./Badge-0PIbcpDO.js";import"./Avatar-CFHo7YSR.js";import"./Spinner-BG3j59Um.js";import"./Skeleton-CwzwMFJo.js";import"./Tooltip-Ca9CUhYJ.js";import"./Toast-HPSiDIc2.js";import"./Accordion-F8I8yqG1.js";import"./Radio-DYZtN_dz.js";import"./editorStore-ByocGlaq.js";import"./react-Cb9lVK8B.js";import"./fileStore-6FVttjBc.js";import"./SearchPanel-DTZGcJNa.js";import"./searchStore-Du6yRHsb.js";import"./projectStore-wjKW615C.js";import"./aiStore-C1VK9pLi.js";import"./memoryStore-CgfBSG-J.js";import"./contextStore-Cf33-zum.js";const ae={title:"Layout/Sidebar",component:t,parameters:{layout:"fullscreen",docs:{description:{component:`Sidebar 组件 Story

设计规范: Sidebar 默认宽度 240px，最小 180px，最大 400px。

功能：
- 可调整宽度的左侧面板
- 包含 Files/Search/KG 标签页
- 支持折叠/展开`}}},tags:["autodocs"],decorators:[l],argTypes:{width:{control:{type:"range",min:180,max:400,step:10},description:"Sidebar width in pixels"},collapsed:{control:"boolean",description:"Whether sidebar is collapsed"},projectId:{control:"text",description:"Current project ID"}}},o={args:{width:d.sidebar.default,collapsed:!1,projectId:null},render:r=>e.jsxs("div",{style:{display:"flex",height:"400px"},children:[e.jsx(t,{...r}),e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Main Content Area"})]})},n={args:{width:0,collapsed:!0,projectId:null},render:r=>e.jsxs("div",{style:{display:"flex",height:"400px"},children:[e.jsx(t,{...r}),e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Sidebar is collapsed"})]})},i={args:{width:d.sidebar.min,collapsed:!1,projectId:null},render:r=>e.jsxs("div",{style:{display:"flex",height:"400px"},children:[e.jsx(t,{...r}),e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Sidebar at minimum width (180px)"})]})},s={args:{width:d.sidebar.max,collapsed:!1,projectId:null},render:r=>e.jsxs("div",{style:{display:"flex",height:"400px"},children:[e.jsx(t,{...r}),e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Sidebar at maximum width (400px)"})]})},a={args:{width:d.sidebar.default,collapsed:!1,projectId:"test-project-id"},render:r=>e.jsxs("div",{style:{display:"flex",height:"400px"},children:[e.jsx(t,{...r}),e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Sidebar with project content"})]})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    width: LAYOUT_DEFAULTS.sidebar.default,
    collapsed: false,
    projectId: null
  },
  render: args => <div style={{
    display: "flex",
    height: "400px"
  }}>
      <Sidebar {...args} />
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
}`,...o.parameters?.docs?.source},description:{story:`默认状态

默认宽度 240px 的展开状态`,...o.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    width: 0,
    collapsed: true,
    projectId: null
  },
  render: args => <div style={{
    display: "flex",
    height: "400px"
  }}>
      <Sidebar {...args} />
      <div style={{
      flex: 1,
      backgroundColor: "var(--color-bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--color-fg-muted)",
      fontSize: "14px"
    }}>
        Sidebar is collapsed
      </div>
    </div>
}`,...n.parameters?.docs?.source},description:{story:`折叠状态

Sidebar 折叠后隐藏`,...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    width: LAYOUT_DEFAULTS.sidebar.min,
    collapsed: false,
    projectId: null
  },
  render: args => <div style={{
    display: "flex",
    height: "400px"
  }}>
      <Sidebar {...args} />
      <div style={{
      flex: 1,
      backgroundColor: "var(--color-bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--color-fg-muted)",
      fontSize: "14px"
    }}>
        Sidebar at minimum width (180px)
      </div>
    </div>
}`,...i.parameters?.docs?.source},description:{story:`最小宽度

180px 最小宽度状态`,...i.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    width: LAYOUT_DEFAULTS.sidebar.max,
    collapsed: false,
    projectId: null
  },
  render: args => <div style={{
    display: "flex",
    height: "400px"
  }}>
      <Sidebar {...args} />
      <div style={{
      flex: 1,
      backgroundColor: "var(--color-bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--color-fg-muted)",
      fontSize: "14px"
    }}>
        Sidebar at maximum width (400px)
      </div>
    </div>
}`,...s.parameters?.docs?.source},description:{story:`最大宽度

400px 最大宽度状态`,...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    width: LAYOUT_DEFAULTS.sidebar.default,
    collapsed: false,
    projectId: "test-project-id"
  },
  render: args => <div style={{
    display: "flex",
    height: "400px"
  }}>
      <Sidebar {...args} />
      <div style={{
      flex: 1,
      backgroundColor: "var(--color-bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--color-fg-muted)",
      fontSize: "14px"
    }}>
        Sidebar with project content
      </div>
    </div>
}`,...a.parameters?.docs?.source},description:{story:`有项目状态

当有项目时显示项目内容`,...a.parameters?.docs?.description}}};const de=["Default","Collapsed","MinWidth","MaxWidth","WithProject"];export{n as Collapsed,o as Default,s as MaxWidth,i as MinWidth,a as WithProject,de as __namedExportsOrder,ae as default};
