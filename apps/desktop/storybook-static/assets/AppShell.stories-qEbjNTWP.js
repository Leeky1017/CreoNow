import{j as r}from"./jsx-runtime-BLchON5X.js";import{R as e}from"./index-DDi9LDaq.js";import{A as n}from"./AppShell-BL7KDr6L.js";import{c as j,a as f,b as y,L as P,T as C,K as M}from"./kgStore-C8isvze5.js";import{c as A,P as b}from"./projectStore-wjKW615C.js";import{c as L,F as k}from"./fileStore-6FVttjBc.js";import{c as B,E}from"./editorStore-ByocGlaq.js";import{c as F,A as I}from"./aiStore-C1VK9pLi.js";import{c as R,M as Z}from"./memoryStore-CgfBSG-J.js";import{c as K,C as T}from"./contextStore-Cf33-zum.js";import{c as W,S as z}from"./searchStore-Du6yRHsb.js";import"./index-kA4PVysc.js";import"./IconBar-CiJpXY8B.js";import"./RightPanel-0IgO3SEN.js";import"./AiPanel-C6tQ-9T_.js";import"./Button-B9XLIlTV.js";import"./Input-BR80orUP.js";import"./Textarea-C3DI-yW7.js";import"./Card-D2dqmnxE.js";import"./ListItem-CyD6nTsv.js";import"./Text-CW-Kyc9R.js";import"./Heading-BzOyC2Oj.js";import"./Dialog-DJV5UiAm.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-Dx0N0K8E.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-c9SlT_P8.js";import"./index-nu25GvvV.js";import"./Popover-BMinsKFS.js";import"./index-wwK3GREC.js";import"./index-CEv_TvBl.js";import"./Select-DBTPtHXT.js";import"./index-D6SgtPiA.js";import"./index-CAq0tSys.js";import"./index-Tf3TKiO9.js";import"./index-BEZKqDeb.js";import"./Checkbox-Ddw3urWg.js";import"./Tabs-DmRrGnuH.js";import"./index-CDK04lop.js";import"./Badge-0PIbcpDO.js";import"./Avatar-CFHo7YSR.js";import"./Spinner-BG3j59Um.js";import"./Skeleton-CwzwMFJo.js";import"./Tooltip-Ca9CUhYJ.js";import"./Toast-HPSiDIc2.js";import"./Accordion-F8I8yqG1.js";import"./Radio-DYZtN_dz.js";import"./ContextViewer-lK2KqFKr.js";import"./DiffView-B8aluX7v.js";import"./SkillPicker-B04EGmsV.js";import"./MemoryPanel-DT_fljws.js";import"./ipcClient-lUJD4lt8.js";import"./Sidebar-DVJZa7VQ.js";import"./FileTreePanel-ObtFQxJU.js";import"./SearchPanel-DTZGcJNa.js";import"./StatusBar-oJ08nY3g.js";import"./Resizer-jeuGm_7o.js";import"./CommandPalette-CuS2GWVE.js";import"./CreateProjectDialog-BNioHGUo.js";import"./react-Cb9lVK8B.js";const p={get:()=>null,set:()=>{},remove:()=>{},clear:()=>{}},o={invoke:async()=>({ok:!0,data:{items:[],settings:{},content:""}}),on:()=>()=>{}};function D({children:m}){const a=e.useMemo(()=>j(p),[]),c=e.useMemo(()=>A(o),[]),l=e.useMemo(()=>L(o),[]),d=e.useMemo(()=>B(o),[]),h=e.useMemo(()=>F(o),[]),S=e.useMemo(()=>R(o),[]),u=e.useMemo(()=>K(o),[]),x=e.useMemo(()=>W(o),[]),g=e.useMemo(()=>f(o),[]),v=e.useMemo(()=>y(p),[]);return r.jsx(P,{store:a,children:r.jsx(b,{store:c,children:r.jsx(k,{store:l,children:r.jsx(E,{store:d,children:r.jsx(C,{store:v,children:r.jsx(I,{store:h,children:r.jsx(Z,{store:S,children:r.jsx(T,{store:u,children:r.jsx(z,{store:x,children:r.jsx(M,{store:g,children:m})})})})})})})})})})}const Ur={title:"Layout/AppShell",component:n,parameters:{layout:"fullscreen",docs:{description:{component:`AppShell 组件 Story

设计规范: AppShell 是主要的布局容器，包含 IconBar、Sidebar、Main、RightPanel、StatusBar。

功能：
- 三列布局（IconBar + Sidebar + Main + RightPanel）
- 支持侧边栏和面板的折叠/展开
- 支持 Zen 模式
- 支持键盘快捷键`}}},tags:["autodocs"],decorators:[m=>r.jsx(D,{children:r.jsx(m,{})})]},t={render:()=>r.jsx("div",{style:{height:"600px"},children:r.jsx(n,{})})},i={render:()=>r.jsx("div",{style:{height:"100vh"},children:r.jsx(n,{})})},s={render:()=>r.jsxs("div",{children:[r.jsxs("div",{style:{padding:"1rem",backgroundColor:"var(--color-bg-surface)",borderBottom:"1px solid var(--color-separator)",fontSize:"12px",color:"var(--color-fg-muted)"},children:[r.jsx("p",{style:{marginBottom:"0.5rem",fontWeight:500},children:"键盘快捷键："}),r.jsxs("ul",{style:{paddingLeft:"1rem",margin:0},children:[r.jsx("li",{children:"Ctrl/Cmd + \\ : 切换侧边栏"}),r.jsx("li",{children:"Ctrl/Cmd + L : 切换右侧面板"}),r.jsx("li",{children:"Ctrl/Cmd + P : 打开命令面板"}),r.jsx("li",{children:"F11 : 进入 Zen 模式"}),r.jsx("li",{children:"Esc : 退出 Zen 模式"})]})]}),r.jsx("div",{style:{height:"500px"},children:r.jsx(n,{})})]})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    height: "600px"
  }}>
      <AppShell />
    </div>
}`,...t.parameters?.docs?.source},description:{story:`默认状态

完整的三列布局，侧边栏和面板都展开`,...t.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  render: () => <div style={{
    height: "100vh"
  }}>
      <AppShell />
    </div>
}`,...i.parameters?.docs?.source},description:{story:`完整高度

全屏高度的布局`,...i.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div>
      <div style={{
      padding: "1rem",
      backgroundColor: "var(--color-bg-surface)",
      borderBottom: "1px solid var(--color-separator)",
      fontSize: "12px",
      color: "var(--color-fg-muted)"
    }}>
        <p style={{
        marginBottom: "0.5rem",
        fontWeight: 500
      }}>键盘快捷键：</p>
        <ul style={{
        paddingLeft: "1rem",
        margin: 0
      }}>
          <li>Ctrl/Cmd + \\ : 切换侧边栏</li>
          <li>Ctrl/Cmd + L : 切换右侧面板</li>
          <li>Ctrl/Cmd + P : 打开命令面板</li>
          <li>F11 : 进入 Zen 模式</li>
          <li>Esc : 退出 Zen 模式</li>
        </ul>
      </div>
      <div style={{
      height: "500px"
    }}>
        <AppShell />
      </div>
    </div>
}`,...s.parameters?.docs?.source},description:{story:`交互指南

展示 AppShell 的交互操作`,...s.parameters?.docs?.description}}};const Vr=["Default","FullHeight","InteractionGuide"];export{t as Default,i as FullHeight,s as InteractionGuide,Vr as __namedExportsOrder,Ur as default};
