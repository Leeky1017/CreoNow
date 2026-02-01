import{j as r}from"./jsx-runtime-BLchON5X.js";import{R as n}from"./index-DDi9LDaq.js";import{A as o}from"./AppShell-BL7KDr6L.js";import{d as e,c as T,a as U,b as M,L as O,T as B,K as F}from"./kgStore-C8isvze5.js";import{c as E,P as D}from"./projectStore-wjKW615C.js";import{c as _,F as P}from"./fileStore-6FVttjBc.js";import{c as Y,E as W}from"./editorStore-ByocGlaq.js";import{c as C,A as z}from"./aiStore-C1VK9pLi.js";import{c as R,M as k}from"./memoryStore-CgfBSG-J.js";import{c as H,C as I}from"./contextStore-Cf33-zum.js";import{c as K,S as V}from"./searchStore-Du6yRHsb.js";import"./index-kA4PVysc.js";import"./IconBar-CiJpXY8B.js";import"./RightPanel-0IgO3SEN.js";import"./AiPanel-C6tQ-9T_.js";import"./Button-B9XLIlTV.js";import"./Input-BR80orUP.js";import"./Textarea-C3DI-yW7.js";import"./Card-D2dqmnxE.js";import"./ListItem-CyD6nTsv.js";import"./Text-CW-Kyc9R.js";import"./Heading-BzOyC2Oj.js";import"./Dialog-DJV5UiAm.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-Dx0N0K8E.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-c9SlT_P8.js";import"./index-nu25GvvV.js";import"./Popover-BMinsKFS.js";import"./index-wwK3GREC.js";import"./index-CEv_TvBl.js";import"./Select-DBTPtHXT.js";import"./index-D6SgtPiA.js";import"./index-CAq0tSys.js";import"./index-Tf3TKiO9.js";import"./index-BEZKqDeb.js";import"./Checkbox-Ddw3urWg.js";import"./Tabs-DmRrGnuH.js";import"./index-CDK04lop.js";import"./Badge-0PIbcpDO.js";import"./Avatar-CFHo7YSR.js";import"./Spinner-BG3j59Um.js";import"./Skeleton-CwzwMFJo.js";import"./Tooltip-Ca9CUhYJ.js";import"./Toast-HPSiDIc2.js";import"./Accordion-F8I8yqG1.js";import"./Radio-DYZtN_dz.js";import"./ContextViewer-lK2KqFKr.js";import"./DiffView-B8aluX7v.js";import"./SkillPicker-B04EGmsV.js";import"./MemoryPanel-DT_fljws.js";import"./ipcClient-lUJD4lt8.js";import"./Sidebar-DVJZa7VQ.js";import"./FileTreePanel-ObtFQxJU.js";import"./SearchPanel-DTZGcJNa.js";import"./StatusBar-oJ08nY3g.js";import"./Resizer-jeuGm_7o.js";import"./CommandPalette-CuS2GWVE.js";import"./CreateProjectDialog-BNioHGUo.js";import"./react-Cb9lVK8B.js";const v={get:()=>null,set:()=>{},remove:()=>{},clear:()=>{}},t={invoke:async()=>({ok:!0,data:{items:[],settings:{},content:""}}),on:()=>()=>{}};function $({children:h}){const g=n.useMemo(()=>T(v),[]),u=n.useMemo(()=>E(t),[]),f=n.useMemo(()=>_(t),[]),y=n.useMemo(()=>Y(t),[]),S=n.useMemo(()=>C(t),[]),j=n.useMemo(()=>R(t),[]),b=n.useMemo(()=>H(t),[]),A=n.useMemo(()=>K(t),[]),L=n.useMemo(()=>U(t),[]),w=n.useMemo(()=>M(v),[]);return r.jsx(O,{store:g,children:r.jsx(D,{store:u,children:r.jsx(P,{store:f,children:r.jsx(W,{store:y,children:r.jsx(B,{store:w,children:r.jsx(z,{store:S,children:r.jsx(k,{store:j,children:r.jsx(I,{store:b,children:r.jsx(V,{store:A,children:r.jsx(F,{store:L,children:h})})})})})})})})})})}const ne={title:"Layout/综合测试",component:o,parameters:{layout:"fullscreen",docs:{description:{component:`Layout 综合测试 Stories

用于验证布局在各种条件下的表现，包括溢出/滚动和响应式行为。`}}},tags:["autodocs"],decorators:[h=>r.jsx($,{children:r.jsx(h,{})})]},d={name:"溢出测试 - 默认",render:()=>r.jsx("div",{style:{height:"600px",border:"2px solid var(--color-border-focus)",overflow:"hidden"},children:r.jsx(o,{})})},i={name:"溢出测试 - 小容器",render:()=>r.jsx("div",{style:{height:"400px",width:"800px",border:"2px solid var(--color-border-focus)",overflow:"hidden",margin:"20px"},children:r.jsx(o,{})})},s={name:"溢出测试 - 最小尺寸",render:()=>r.jsxs("div",{children:[r.jsx("div",{style:{marginBottom:"1rem",padding:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)",backgroundColor:"var(--color-bg-surface)"},children:"最小窗口尺寸测试：IconBar(48) + Sidebar(180) + Main(400) + Panel(280) = 908px"}),r.jsx("div",{style:{height:"300px",width:`${e.iconBarWidth+e.sidebar.min+e.mainMinWidth+e.panel.min}px`,border:"2px solid var(--color-border-focus)",overflow:"hidden"},children:r.jsx(o,{})})]})},a={name:"响应式 - 宽屏 (1920px)",render:()=>r.jsx("div",{style:{height:"600px",width:"1920px",border:"2px solid var(--color-border-focus)",overflow:"hidden"},children:r.jsx(o,{})})},p={name:"响应式 - 标准 (1440px)",render:()=>r.jsx("div",{style:{height:"600px",width:"1440px",border:"2px solid var(--color-border-focus)",overflow:"hidden"},children:r.jsx(o,{})})},l={name:"响应式 - 笔记本 (1280px)",render:()=>r.jsx("div",{style:{height:"500px",width:"1280px",border:"2px solid var(--color-border-focus)",overflow:"hidden"},children:r.jsx(o,{})})},c={name:"响应式 - 小笔记本 (1024px)",render:()=>r.jsx("div",{style:{height:"500px",width:"1024px",border:"2px solid var(--color-border-focus)",overflow:"hidden"},children:r.jsx(o,{})})},m={name:"高度变化测试",render:()=>r.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem",padding:"1rem"},children:[r.jsxs("div",{children:[r.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)",marginBottom:"0.5rem"},children:"高度: 800px"}),r.jsx("div",{style:{height:"200px",width:"100%",border:"2px solid var(--color-border-focus)",overflow:"hidden"},children:r.jsx(o,{})})]}),r.jsxs("div",{children:[r.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)",marginBottom:"0.5rem"},children:"高度: 400px"}),r.jsx("div",{style:{height:"150px",width:"100%",border:"2px solid var(--color-border-focus)",overflow:"hidden"},children:r.jsx(o,{})})]})]})},x={name:"布局常量",render:()=>r.jsxs("div",{style:{padding:"2rem",backgroundColor:"var(--color-bg-surface)",color:"var(--color-fg-default)",fontFamily:"monospace",fontSize:"13px"},children:[r.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px"},children:"LAYOUT_DEFAULTS"}),r.jsxs("table",{style:{borderCollapse:"collapse",width:"100%"},children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{style:{textAlign:"left",padding:"0.5rem",borderBottom:"1px solid var(--color-separator)"},children:"属性"}),r.jsx("th",{style:{textAlign:"left",padding:"0.5rem",borderBottom:"1px solid var(--color-separator)"},children:"值"})]})}),r.jsxs("tbody",{children:[r.jsxs("tr",{children:[r.jsx("td",{style:{padding:"0.5rem"},children:"iconBarWidth"}),r.jsxs("td",{style:{padding:"0.5rem"},children:[e.iconBarWidth,"px"]})]}),r.jsxs("tr",{children:[r.jsx("td",{style:{padding:"0.5rem"},children:"statusBarHeight"}),r.jsxs("td",{style:{padding:"0.5rem"},children:[e.statusBarHeight,"px"]})]}),r.jsxs("tr",{children:[r.jsx("td",{style:{padding:"0.5rem"},children:"sidebar.min"}),r.jsxs("td",{style:{padding:"0.5rem"},children:[e.sidebar.min,"px"]})]}),r.jsxs("tr",{children:[r.jsx("td",{style:{padding:"0.5rem"},children:"sidebar.max"}),r.jsxs("td",{style:{padding:"0.5rem"},children:[e.sidebar.max,"px"]})]}),r.jsxs("tr",{children:[r.jsx("td",{style:{padding:"0.5rem"},children:"sidebar.default"}),r.jsxs("td",{style:{padding:"0.5rem"},children:[e.sidebar.default,"px"]})]}),r.jsxs("tr",{children:[r.jsx("td",{style:{padding:"0.5rem"},children:"panel.min"}),r.jsxs("td",{style:{padding:"0.5rem"},children:[e.panel.min,"px"]})]}),r.jsxs("tr",{children:[r.jsx("td",{style:{padding:"0.5rem"},children:"panel.max"}),r.jsxs("td",{style:{padding:"0.5rem"},children:[e.panel.max,"px"]})]}),r.jsxs("tr",{children:[r.jsx("td",{style:{padding:"0.5rem"},children:"panel.default"}),r.jsxs("td",{style:{padding:"0.5rem"},children:[e.panel.default,"px"]})]}),r.jsxs("tr",{children:[r.jsx("td",{style:{padding:"0.5rem"},children:"mainMinWidth"}),r.jsxs("td",{style:{padding:"0.5rem"},children:[e.mainMinWidth,"px"]})]})]})]})]})};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "溢出测试 - 默认",
  render: () => <div style={{
    height: "600px",
    border: "2px solid var(--color-border-focus)",
    overflow: "hidden"
  }}>
      <AppShell />
    </div>
}`,...d.parameters?.docs?.source},description:{story:`溢出测试 - 默认布局

验证 Flex 布局不会溢出容器`,...d.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "溢出测试 - 小容器",
  render: () => <div style={{
    height: "400px",
    width: "800px",
    border: "2px solid var(--color-border-focus)",
    overflow: "hidden",
    margin: "20px"
  }}>
      <AppShell />
    </div>
}`,...i.parameters?.docs?.source},description:{story:`溢出测试 - 小容器

验证在较小容器中布局不会溢出`,...i.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "溢出测试 - 最小尺寸",
  render: () => <div>
      <div style={{
      marginBottom: "1rem",
      padding: "0.5rem",
      fontSize: "12px",
      color: "var(--color-fg-muted)",
      backgroundColor: "var(--color-bg-surface)"
    }}>
        最小窗口尺寸测试：IconBar(48) + Sidebar(180) + Main(400) + Panel(280) = 908px
      </div>
      <div style={{
      height: "300px",
      width: \`\${LAYOUT_DEFAULTS.iconBarWidth + LAYOUT_DEFAULTS.sidebar.min + LAYOUT_DEFAULTS.mainMinWidth + LAYOUT_DEFAULTS.panel.min}px\`,
      border: "2px solid var(--color-border-focus)",
      overflow: "hidden"
    }}>
        <AppShell />
      </div>
    </div>
}`,...s.parameters?.docs?.source},description:{story:`溢出测试 - 最小尺寸

验证在最小支持尺寸下布局的表现`,...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  name: "响应式 - 宽屏 (1920px)",
  render: () => <div style={{
    height: "600px",
    width: "1920px",
    border: "2px solid var(--color-border-focus)",
    overflow: "hidden"
  }}>
      <AppShell />
    </div>
}`,...a.parameters?.docs?.source},description:{story:`响应式测试 - 宽屏

验证在宽屏下的布局表现`,...a.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: "响应式 - 标准 (1440px)",
  render: () => <div style={{
    height: "600px",
    width: "1440px",
    border: "2px solid var(--color-border-focus)",
    overflow: "hidden"
  }}>
      <AppShell />
    </div>
}`,...p.parameters?.docs?.source},description:{story:`响应式测试 - 标准屏

验证在标准屏幕下的布局表现`,...p.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "响应式 - 笔记本 (1280px)",
  render: () => <div style={{
    height: "500px",
    width: "1280px",
    border: "2px solid var(--color-border-focus)",
    overflow: "hidden"
  }}>
      <AppShell />
    </div>
}`,...l.parameters?.docs?.source},description:{story:`响应式测试 - 笔记本

验证在笔记本屏幕下的布局表现`,...l.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: "响应式 - 小笔记本 (1024px)",
  render: () => <div style={{
    height: "500px",
    width: "1024px",
    border: "2px solid var(--color-border-focus)",
    overflow: "hidden"
  }}>
      <AppShell />
    </div>
}`,...c.parameters?.docs?.source},description:{story:`响应式测试 - 小笔记本

验证在小笔记本屏幕下的布局表现`,...c.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: "高度变化测试",
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    padding: "1rem"
  }}>
      <div>
        <div style={{
        fontSize: "12px",
        color: "var(--color-fg-muted)",
        marginBottom: "0.5rem"
      }}>
          高度: 800px
        </div>
        <div style={{
        height: "200px",
        width: "100%",
        border: "2px solid var(--color-border-focus)",
        overflow: "hidden"
      }}>
          <AppShell />
        </div>
      </div>
      <div>
        <div style={{
        fontSize: "12px",
        color: "var(--color-fg-muted)",
        marginBottom: "0.5rem"
      }}>
          高度: 400px
        </div>
        <div style={{
        height: "150px",
        width: "100%",
        border: "2px solid var(--color-border-focus)",
        overflow: "hidden"
      }}>
          <AppShell />
        </div>
      </div>
    </div>
}`,...m.parameters?.docs?.source},description:{story:`高度变化测试

验证不同高度下的布局表现`,...m.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: "布局常量",
  render: () => <div style={{
    padding: "2rem",
    backgroundColor: "var(--color-bg-surface)",
    color: "var(--color-fg-default)",
    fontFamily: "monospace",
    fontSize: "13px"
  }}>
      <h3 style={{
      margin: "0 0 1rem",
      fontSize: "14px"
    }}>LAYOUT_DEFAULTS</h3>
      <table style={{
      borderCollapse: "collapse",
      width: "100%"
    }}>
        <thead>
          <tr>
            <th style={{
            textAlign: "left",
            padding: "0.5rem",
            borderBottom: "1px solid var(--color-separator)"
          }}>
              属性
            </th>
            <th style={{
            textAlign: "left",
            padding: "0.5rem",
            borderBottom: "1px solid var(--color-separator)"
          }}>
              值
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{
            padding: "0.5rem"
          }}>iconBarWidth</td>
            <td style={{
            padding: "0.5rem"
          }}>{LAYOUT_DEFAULTS.iconBarWidth}px</td>
          </tr>
          <tr>
            <td style={{
            padding: "0.5rem"
          }}>statusBarHeight</td>
            <td style={{
            padding: "0.5rem"
          }}>{LAYOUT_DEFAULTS.statusBarHeight}px</td>
          </tr>
          <tr>
            <td style={{
            padding: "0.5rem"
          }}>sidebar.min</td>
            <td style={{
            padding: "0.5rem"
          }}>{LAYOUT_DEFAULTS.sidebar.min}px</td>
          </tr>
          <tr>
            <td style={{
            padding: "0.5rem"
          }}>sidebar.max</td>
            <td style={{
            padding: "0.5rem"
          }}>{LAYOUT_DEFAULTS.sidebar.max}px</td>
          </tr>
          <tr>
            <td style={{
            padding: "0.5rem"
          }}>sidebar.default</td>
            <td style={{
            padding: "0.5rem"
          }}>{LAYOUT_DEFAULTS.sidebar.default}px</td>
          </tr>
          <tr>
            <td style={{
            padding: "0.5rem"
          }}>panel.min</td>
            <td style={{
            padding: "0.5rem"
          }}>{LAYOUT_DEFAULTS.panel.min}px</td>
          </tr>
          <tr>
            <td style={{
            padding: "0.5rem"
          }}>panel.max</td>
            <td style={{
            padding: "0.5rem"
          }}>{LAYOUT_DEFAULTS.panel.max}px</td>
          </tr>
          <tr>
            <td style={{
            padding: "0.5rem"
          }}>panel.default</td>
            <td style={{
            padding: "0.5rem"
          }}>{LAYOUT_DEFAULTS.panel.default}px</td>
          </tr>
          <tr>
            <td style={{
            padding: "0.5rem"
          }}>mainMinWidth</td>
            <td style={{
            padding: "0.5rem"
          }}>{LAYOUT_DEFAULTS.mainMinWidth}px</td>
          </tr>
        </tbody>
      </table>
    </div>
}`,...x.parameters?.docs?.source},description:{story:`布局常量展示

展示所有布局相关的常量值`,...x.parameters?.docs?.description}}};const oe=["OverflowDefault","OverflowSmallContainer","OverflowMinimumSize","ResponsiveWide","ResponsiveStandard","ResponsiveLaptop","ResponsiveSmallLaptop","HeightVariations","LayoutConstants"];export{m as HeightVariations,x as LayoutConstants,d as OverflowDefault,s as OverflowMinimumSize,i as OverflowSmallContainer,l as ResponsiveLaptop,c as ResponsiveSmallLaptop,p as ResponsiveStandard,a as ResponsiveWide,oe as __namedExportsOrder,ne as default};
