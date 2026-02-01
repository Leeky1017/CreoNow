import{j as e}from"./jsx-runtime-BLchON5X.js";import{R as t}from"./RightPanel-0IgO3SEN.js";import{l as p}from"./test-utils-Bpb5VK9w.js";import{d as l}from"./kgStore-C8isvze5.js";import"./index-kA4PVysc.js";import"./AiPanel-C6tQ-9T_.js";import"./index-DDi9LDaq.js";import"./Button-B9XLIlTV.js";import"./Input-BR80orUP.js";import"./Textarea-C3DI-yW7.js";import"./Card-D2dqmnxE.js";import"./ListItem-CyD6nTsv.js";import"./Text-CW-Kyc9R.js";import"./Heading-BzOyC2Oj.js";import"./Dialog-DJV5UiAm.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-Dx0N0K8E.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-c9SlT_P8.js";import"./index-nu25GvvV.js";import"./Popover-BMinsKFS.js";import"./index-wwK3GREC.js";import"./index-CEv_TvBl.js";import"./Select-DBTPtHXT.js";import"./index-D6SgtPiA.js";import"./index-CAq0tSys.js";import"./index-Tf3TKiO9.js";import"./index-BEZKqDeb.js";import"./Checkbox-Ddw3urWg.js";import"./Tabs-DmRrGnuH.js";import"./index-CDK04lop.js";import"./Badge-0PIbcpDO.js";import"./Avatar-CFHo7YSR.js";import"./Spinner-BG3j59Um.js";import"./Skeleton-CwzwMFJo.js";import"./Tooltip-Ca9CUhYJ.js";import"./Toast-HPSiDIc2.js";import"./Accordion-F8I8yqG1.js";import"./Radio-DYZtN_dz.js";import"./aiStore-C1VK9pLi.js";import"./react-Cb9lVK8B.js";import"./contextStore-Cf33-zum.js";import"./editorStore-ByocGlaq.js";import"./projectStore-wjKW615C.js";import"./ContextViewer-lK2KqFKr.js";import"./DiffView-B8aluX7v.js";import"./SkillPicker-B04EGmsV.js";import"./MemoryPanel-DT_fljws.js";import"./memoryStore-CgfBSG-J.js";import"./ipcClient-lUJD4lt8.js";import"./fileStore-6FVttjBc.js";import"./searchStore-Du6yRHsb.js";const ce={title:"Layout/RightPanel",component:t,parameters:{layout:"fullscreen",docs:{description:{component:`RightPanel 组件 Story

设计规范 §5.3: 右侧面板默认宽度 320px，最小 240px，最大 600px。

功能：
- 可调整宽度的右侧面板
- 包含 AI/Memory/Settings 面板
- 支持折叠/展开`}}},tags:["autodocs"],decorators:[p],argTypes:{width:{control:{type:"range",min:280,max:480,step:10},description:"Panel width in pixels"},collapsed:{control:"boolean",description:"Whether panel is collapsed"}}},n={args:{width:l.panel.default,collapsed:!1},render:r=>e.jsxs("div",{style:{display:"flex",height:"400px"},children:[e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Main Content Area"}),e.jsx(t,{...r})]})},o={args:{width:0,collapsed:!0},render:r=>e.jsxs("div",{style:{display:"flex",height:"400px"},children:[e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Right panel is collapsed"}),e.jsx(t,{...r})]})},i={args:{width:l.panel.min,collapsed:!1},render:r=>e.jsxs("div",{style:{display:"flex",height:"400px"},children:[e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Panel at minimum width (280px)"}),e.jsx(t,{...r})]})},a={args:{width:l.panel.max,collapsed:!1},render:r=>e.jsxs("div",{style:{display:"flex",height:"400px"},children:[e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Panel at maximum width (480px)"}),e.jsx(t,{...r})]})},s={args:{width:l.panel.default,collapsed:!1},render:r=>e.jsxs("div",{style:{display:"flex",height:"100vh"},children:[e.jsx("div",{style:{flex:1,backgroundColor:"var(--color-bg-base)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-fg-muted)",fontSize:"14px"},children:"Full height layout"}),e.jsx(t,{...r})]})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    width: LAYOUT_DEFAULTS.panel.default,
    collapsed: false
  },
  render: args => <div style={{
    display: "flex",
    height: "400px"
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
      <RightPanel {...args} />
    </div>
}`,...n.parameters?.docs?.source},description:{story:`默认状态

默认宽度 320px 的展开状态`,...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    width: 0,
    collapsed: true
  },
  render: args => <div style={{
    display: "flex",
    height: "400px"
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
        Right panel is collapsed
      </div>
      <RightPanel {...args} />
    </div>
}`,...o.parameters?.docs?.source},description:{story:`折叠状态

RightPanel 折叠后隐藏`,...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    width: LAYOUT_DEFAULTS.panel.min,
    collapsed: false
  },
  render: args => <div style={{
    display: "flex",
    height: "400px"
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
        Panel at minimum width (280px)
      </div>
      <RightPanel {...args} />
    </div>
}`,...i.parameters?.docs?.source},description:{story:`最小宽度

280px 最小宽度状态`,...i.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    width: LAYOUT_DEFAULTS.panel.max,
    collapsed: false
  },
  render: args => <div style={{
    display: "flex",
    height: "400px"
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
        Panel at maximum width (480px)
      </div>
      <RightPanel {...args} />
    </div>
}`,...a.parameters?.docs?.source},description:{story:`最大宽度

480px 最大宽度状态`,...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    width: LAYOUT_DEFAULTS.panel.default,
    collapsed: false
  },
  render: args => <div style={{
    display: "flex",
    height: "100vh"
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
        Full height layout
      </div>
      <RightPanel {...args} />
    </div>
}`,...s.parameters?.docs?.source},description:{story:`完整高度

全屏高度状态下的面板`,...s.parameters?.docs?.description}}};const me=["Default","Collapsed","MinWidth","MaxWidth","FullHeight"];export{o as Collapsed,n as Default,s as FullHeight,a as MaxWidth,i as MinWidth,me as __namedExportsOrder,ce as default};
