import{j as e}from"./jsx-runtime-BLchON5X.js";import{r as z}from"./index-DDi9LDaq.js";import{T as t}from"./Tabs-DmRrGnuH.js";import"./index-kA4PVysc.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-CDK04lop.js";import"./index-D6SgtPiA.js";import"./index-Dx0N0K8E.js";import"./index-CQ0IhcTf.js";import"./index-CAq0tSys.js";import"./index-nu25GvvV.js";const B={title:"Primitives/Tabs",component:t,parameters:{layout:"centered",docs:{description:{component:`Tabs 组件 Story

设计规范 §6.6
标签页组件，基于 Radix UI Tabs 原语构建。
支持水平/垂直方向、受控/非受控模式、禁用状态。

状态矩阵（MUST 全部实现）：
- default: 未选中状态
- active: 选中状态（高亮显示）
- hover: 悬停状态
- focus-visible: 键盘聚焦状态
- disabled: 禁用状态`}}},tags:["autodocs"],argTypes:{orientation:{control:"select",options:["horizontal","vertical"],description:"Orientation of tabs"},fullWidth:{control:"boolean",description:"Full width tabs"}}},n=[{value:"tab1",label:"Tab 1",content:e.jsx("div",{children:"Content for Tab 1"})},{value:"tab2",label:"Tab 2",content:e.jsx("div",{children:"Content for Tab 2"})},{value:"tab3",label:"Tab 3",content:e.jsx("div",{children:"Content for Tab 3"})}],j=[{value:"general",label:"General",content:e.jsxs("div",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"16px"},children:"General Settings"}),e.jsx("p",{children:"Configure general application settings here."})]})},{value:"appearance",label:"Appearance",content:e.jsxs("div",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"16px"},children:"Appearance"}),e.jsx("p",{children:"Customize the look and feel of the application."})]})},{value:"notifications",label:"Notifications",content:e.jsxs("div",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"16px"},children:"Notifications"}),e.jsx("p",{children:"Manage notification preferences."})]})},{value:"advanced",label:"Advanced",content:e.jsxs("div",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"16px"},children:"Advanced"}),e.jsx("p",{children:"Advanced configuration options for power users."})]})}],S=[{value:"active",label:"Active",content:e.jsx("div",{children:"Active tab content"})},{value:"available",label:"Available",content:e.jsx("div",{children:"Available tab content"})},{value:"disabled",label:"Disabled",disabled:!0,content:e.jsx("div",{children:"This content should not be visible"})},{value:"another",label:"Another",content:e.jsx("div",{children:"Another tab content"})}],r={args:{tabs:n}},s={args:{tabs:j,defaultValue:"general"}},o={args:{tabs:n},render:function(){const[a,T]=z.useState("tab1");return e.jsxs("div",{children:[e.jsxs("div",{style:{marginBottom:"1rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:["Current tab: ",a]}),e.jsx(t,{tabs:n,value:a,onValueChange:T})]})}},i={args:{tabs:n,defaultValue:"tab2"}},l={args:{tabs:n,orientation:"horizontal"}},c={args:{tabs:j,orientation:"vertical"},parameters:{layout:"padded"}},d={args:{tabs:S,defaultValue:"active"}},p={args:{tabs:n,fullWidth:!0},parameters:{layout:"padded"},decorators:[y=>e.jsx("div",{style:{width:"400px"},children:e.jsx(y,{})})]},u={args:{tabs:[{value:"t1",label:"Very Long Tab Label",content:e.jsx("div",{children:"Content 1"})},{value:"t2",label:"Another Long Label",content:e.jsx("div",{children:"Content 2"})},{value:"t3",label:"Short",content:e.jsx("div",{children:"Content 3"})}]}},v={args:{tabs:Array.from({length:8},(y,a)=>({value:`tab${a+1}`,label:`Tab ${a+1}`,content:e.jsxs("div",{children:["Content for Tab ",a+1]})}))},parameters:{layout:"padded"}},m={args:{tabs:[{value:"files",label:e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 16 16",fill:"currentColor",children:e.jsx("path",{d:"M1 3.5A1.5 1.5 0 0 1 2.5 2h3.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H13.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"})}),"Files"]}),content:e.jsx("div",{children:"File browser content"})},{value:"search",label:e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 16 16",fill:"currentColor",children:e.jsx("path",{fillRule:"evenodd",d:"M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zm-.82 4.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04z"})}),"Search"]}),content:e.jsx("div",{children:"Search content"})},{value:"settings",label:e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:"6px"},children:[e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 16 16",fill:"currentColor",children:e.jsx("path",{fillRule:"evenodd",d:"M7.429 1.525a6.593 6.593 0 0 1 1.142 0c.036.003.108.036.137.146l.289 1.105c.147.56.55.967.997 1.189.174.086.341.183.501.29.417.278.97.423 1.53.27l1.102-.303c.11-.03.175.016.195.046.219.31.41.641.573.989.014.031.022.11-.059.19l-.815.806c-.411.406-.562.957-.53 1.456a4.588 4.588 0 0 1 0 .582c-.032.499.119 1.05.53 1.456l.815.806c.08.08.073.159.059.19a6.494 6.494 0 0 1-.573.99c-.02.029-.086.074-.195.045l-1.103-.303c-.559-.153-1.112-.008-1.529.27-.16.107-.327.204-.5.29-.449.222-.851.628-.998 1.189l-.289 1.105c-.029.11-.101.143-.137.146a6.613 6.613 0 0 1-1.142 0c-.036-.003-.108-.037-.137-.146l-.289-1.105c-.147-.56-.55-.967-.997-1.189a4.502 4.502 0 0 1-.501-.29c-.417-.278-.97-.423-1.53-.27l-1.102.303c-.11.03-.175-.016-.195-.046a6.492 6.492 0 0 1-.573-.989c-.014-.031-.022-.11.059-.19l.815-.806c.411-.406.562-.957.53-1.456a4.587 4.587 0 0 1 0-.582c.032-.499-.119-1.05-.53-1.456l-.815-.806c-.08-.08-.073-.159-.059-.19a6.44 6.44 0 0 1 .573-.99c.02-.029.086-.074.195-.045l1.103.303c.559.153 1.112.008 1.529-.27.16-.107.327-.204.5-.29.449-.222.851-.628.998-1.189l.289-1.105c.029-.11.101-.143.137-.146zM8 0c-.236 0-.47.01-.701.03-.743.065-1.29.615-1.458 1.261l-.29 1.106c-.017.066-.078.158-.211.224a5.994 5.994 0 0 0-.668.386c-.123.082-.233.09-.3.071L3.27 2.776c-.644-.177-1.392.02-1.82.63a7.977 7.977 0 0 0-.704 1.217c-.315.675-.111 1.422.363 1.891l.815.806c.05.048.098.147.088.294a6.084 6.084 0 0 0 0 .772c.01.147-.037.246-.088.294l-.815.806c-.474.469-.678 1.216-.363 1.891.2.428.436.835.704 1.218.428.609 1.176.806 1.82.63l1.102-.303c.067-.019.177-.011.3.071.214.143.437.272.668.386.133.066.194.158.212.224l.289 1.106c.169.646.715 1.196 1.458 1.26a8.094 8.094 0 0 0 1.402 0c.743-.064 1.29-.614 1.458-1.26l.29-1.106c.017-.066.078-.158.211-.224a5.98 5.98 0 0 0 .668-.386c.123-.082.233-.09.3-.071l1.102.302c.644.177 1.392-.02 1.82-.63.268-.382.505-.789.704-1.217.315-.675.111-1.422-.364-1.891l-.814-.806c-.05-.048-.098-.147-.088-.294a6.1 6.1 0 0 0 0-.772c-.01-.147.038-.246.088-.294l.814-.806c.475-.469.679-1.216.364-1.891a7.992 7.992 0 0 0-.704-1.218c-.428-.609-1.176-.806-1.82-.63l-1.103.303c-.066.019-.176.011-.299-.071a5.991 5.991 0 0 0-.668-.386c-.133-.066-.194-.158-.212-.224L10.16 1.29C9.99.645 9.444.095 8.701.031A8.094 8.094 0 0 0 8 0zm1.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"})}),"Settings"]}),content:e.jsx("div",{children:"Settings content"})}]}},b={args:{tabs:[{value:"overview",label:"Overview",content:e.jsxs("div",{style:{padding:"1rem",background:"var(--color-bg-surface)",borderRadius:"var(--radius-md)"},children:[e.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px"},children:"Project Overview"}),e.jsx("p",{style:{margin:"0 0 1rem",color:"var(--color-fg-muted)",fontSize:"13px"},children:"This is a comprehensive overview of your project."}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"1rem"},children:[e.jsxs("div",{style:{padding:"1rem",background:"var(--color-bg-default)",borderRadius:"var(--radius-sm)"},children:[e.jsx("div",{style:{fontSize:"24px",fontWeight:"600"},children:"128"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Documents"})]}),e.jsxs("div",{style:{padding:"1rem",background:"var(--color-bg-default)",borderRadius:"var(--radius-sm)"},children:[e.jsx("div",{style:{fontSize:"24px",fontWeight:"600"},children:"45k"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Words"})]}),e.jsxs("div",{style:{padding:"1rem",background:"var(--color-bg-default)",borderRadius:"var(--radius-sm)"},children:[e.jsx("div",{style:{fontSize:"24px",fontWeight:"600"},children:"12"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Characters"})]})]})]})},{value:"details",label:"Details",content:e.jsxs("div",{style:{padding:"1rem"},children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"16px"},children:"Details"}),e.jsxs("ul",{style:{margin:0,paddingLeft:"1.5rem",color:"var(--color-fg-muted)"},children:[e.jsx("li",{children:"Created: 2024-01-15"}),e.jsx("li",{children:"Last modified: 2024-01-20"}),e.jsx("li",{children:"Author: John Doe"})]})]})}]},parameters:{layout:"padded"}},g={args:{tabs:[{value:"only",label:"Only Tab",content:e.jsx("div",{children:"Single tab content"})}]}},h={args:{tabs:[{value:"t1",label:"Tab 1",content:e.jsx("div",{})},{value:"t2",label:"Tab 2",content:e.jsx("div",{children:"Has content"})}]}},f={args:{tabs:n},parameters:{docs:{description:{story:"使用 Tab 键聚焦到标签，用左右箭头键切换，验证 focus ring 和键盘导航"}}}},x={args:{tabs:n},parameters:{layout:"fullscreen"},render:()=>e.jsxs("div",{style:{padding:"2rem",display:"flex",flexDirection:"column",gap:"2rem"},children:[e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Horizontal (Default)"}),e.jsx(t,{tabs:n})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Vertical"}),e.jsx(t,{tabs:j,orientation:"vertical"})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"With Disabled"}),e.jsx(t,{tabs:S})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Full Width"}),e.jsx("div",{style:{maxWidth:"400px"},children:e.jsx(t,{tabs:n,fullWidth:!0})})]})]})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: basicTabs
  }
}`,...r.parameters?.docs?.source},description:{story:"默认 Tabs",...r.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: settingsTabs,
    defaultValue: "general"
  }
}`,...s.parameters?.docs?.source},description:{story:"设置页 Tabs 示例",...s.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: basicTabs
  },
  render: function Render() {
    const [value, setValue] = useState("tab1");
    return <div>
        <div style={{
        marginBottom: "1rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Current tab: {value}
        </div>
        <Tabs tabs={basicTabs} value={value} onValueChange={setValue} />
      </div>;
  }
}`,...o.parameters?.docs?.source},description:{story:"受控模式",...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: basicTabs,
    defaultValue: "tab2"
  }
}`,...i.parameters?.docs?.source},description:{story:"指定默认选中项",...i.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: basicTabs,
    orientation: "horizontal"
  }
}`,...l.parameters?.docs?.source},description:{story:"水平方向（默认）",...l.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: settingsTabs,
    orientation: "vertical"
  },
  parameters: {
    layout: "padded"
  }
}`,...c.parameters?.docs?.source},description:{story:"垂直方向",...c.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: tabsWithDisabled,
    defaultValue: "active"
  }
}`,...d.parameters?.docs?.source},description:{story:"带禁用项",...d.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: basicTabs,
    fullWidth: true
  },
  parameters: {
    layout: "padded"
  },
  decorators: [Story => <div style={{
    width: "400px"
  }}>
        <Story />
      </div>]
}`,...p.parameters?.docs?.source},description:{story:"全宽模式",...p.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: [{
      value: "t1",
      label: "Very Long Tab Label",
      content: <div>Content 1</div>
    }, {
      value: "t2",
      label: "Another Long Label",
      content: <div>Content 2</div>
    }, {
      value: "t3",
      label: "Short",
      content: <div>Content 3</div>
    }]
  }
}`,...u.parameters?.docs?.source},description:{story:"长标签",...u.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: Array.from({
      length: 8
    }, (_, i) => ({
      value: \`tab\${i + 1}\`,
      label: \`Tab \${i + 1}\`,
      content: <div>Content for Tab {i + 1}</div>
    }))
  },
  parameters: {
    layout: "padded"
  }
}`,...v.parameters?.docs?.source},description:{story:"多个标签",...v.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: [{
      value: "files",
      label: <span style={{
        display: "flex",
        alignItems: "center",
        gap: "6px"
      }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H13.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
            </svg>
            Files
          </span>,
      content: <div>File browser content</div>
    }, {
      value: "search",
      label: <span style={{
        display: "flex",
        alignItems: "center",
        gap: "6px"
      }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zm-.82 4.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04z" />
            </svg>
            Search
          </span>,
      content: <div>Search content</div>
    }, {
      value: "settings",
      label: <span style={{
        display: "flex",
        alignItems: "center",
        gap: "6px"
      }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M7.429 1.525a6.593 6.593 0 0 1 1.142 0c.036.003.108.036.137.146l.289 1.105c.147.56.55.967.997 1.189.174.086.341.183.501.29.417.278.97.423 1.53.27l1.102-.303c.11-.03.175.016.195.046.219.31.41.641.573.989.014.031.022.11-.059.19l-.815.806c-.411.406-.562.957-.53 1.456a4.588 4.588 0 0 1 0 .582c-.032.499.119 1.05.53 1.456l.815.806c.08.08.073.159.059.19a6.494 6.494 0 0 1-.573.99c-.02.029-.086.074-.195.045l-1.103-.303c-.559-.153-1.112-.008-1.529.27-.16.107-.327.204-.5.29-.449.222-.851.628-.998 1.189l-.289 1.105c-.029.11-.101.143-.137.146a6.613 6.613 0 0 1-1.142 0c-.036-.003-.108-.037-.137-.146l-.289-1.105c-.147-.56-.55-.967-.997-1.189a4.502 4.502 0 0 1-.501-.29c-.417-.278-.97-.423-1.53-.27l-1.102.303c-.11.03-.175-.016-.195-.046a6.492 6.492 0 0 1-.573-.989c-.014-.031-.022-.11.059-.19l.815-.806c.411-.406.562-.957.53-1.456a4.587 4.587 0 0 1 0-.582c.032-.499-.119-1.05-.53-1.456l-.815-.806c-.08-.08-.073-.159-.059-.19a6.44 6.44 0 0 1 .573-.99c.02-.029.086-.074.195-.045l1.103.303c.559.153 1.112.008 1.529-.27.16-.107.327-.204.5-.29.449-.222.851-.628.998-1.189l.289-1.105c.029-.11.101-.143.137-.146zM8 0c-.236 0-.47.01-.701.03-.743.065-1.29.615-1.458 1.261l-.29 1.106c-.017.066-.078.158-.211.224a5.994 5.994 0 0 0-.668.386c-.123.082-.233.09-.3.071L3.27 2.776c-.644-.177-1.392.02-1.82.63a7.977 7.977 0 0 0-.704 1.217c-.315.675-.111 1.422.363 1.891l.815.806c.05.048.098.147.088.294a6.084 6.084 0 0 0 0 .772c.01.147-.037.246-.088.294l-.815.806c-.474.469-.678 1.216-.363 1.891.2.428.436.835.704 1.218.428.609 1.176.806 1.82.63l1.102-.303c.067-.019.177-.011.3.071.214.143.437.272.668.386.133.066.194.158.212.224l.289 1.106c.169.646.715 1.196 1.458 1.26a8.094 8.094 0 0 0 1.402 0c.743-.064 1.29-.614 1.458-1.26l.29-1.106c.017-.066.078-.158.211-.224a5.98 5.98 0 0 0 .668-.386c.123-.082.233-.09.3-.071l1.102.302c.644.177 1.392-.02 1.82-.63.268-.382.505-.789.704-1.217.315-.675.111-1.422-.364-1.891l-.814-.806c-.05-.048-.098-.147-.088-.294a6.1 6.1 0 0 0 0-.772c-.01-.147.038-.246.088-.294l.814-.806c.475-.469.679-1.216.364-1.891a7.992 7.992 0 0 0-.704-1.218c-.428-.609-1.176-.806-1.82-.63l-1.103.303c-.066.019-.176.011-.299-.071a5.991 5.991 0 0 0-.668-.386c-.133-.066-.194-.158-.212-.224L10.16 1.29C9.99.645 9.444.095 8.701.031A8.094 8.094 0 0 0 8 0zm1.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
            </svg>
            Settings
          </span>,
      content: <div>Settings content</div>
    }]
  }
}`,...m.parameters?.docs?.source},description:{story:"带图标的标签",...m.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: [{
      value: "overview",
      label: "Overview",
      content: <div style={{
        padding: "1rem",
        background: "var(--color-bg-surface)",
        borderRadius: "var(--radius-md)"
      }}>
            <h3 style={{
          margin: "0 0 0.5rem",
          fontSize: "16px"
        }}>Project Overview</h3>
            <p style={{
          margin: "0 0 1rem",
          color: "var(--color-fg-muted)",
          fontSize: "13px"
        }}>
              This is a comprehensive overview of your project.
            </p>
            <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem"
        }}>
              <div style={{
            padding: "1rem",
            background: "var(--color-bg-default)",
            borderRadius: "var(--radius-sm)"
          }}>
                <div style={{
              fontSize: "24px",
              fontWeight: "600"
            }}>128</div>
                <div style={{
              fontSize: "12px",
              color: "var(--color-fg-muted)"
            }}>Documents</div>
              </div>
              <div style={{
            padding: "1rem",
            background: "var(--color-bg-default)",
            borderRadius: "var(--radius-sm)"
          }}>
                <div style={{
              fontSize: "24px",
              fontWeight: "600"
            }}>45k</div>
                <div style={{
              fontSize: "12px",
              color: "var(--color-fg-muted)"
            }}>Words</div>
              </div>
              <div style={{
            padding: "1rem",
            background: "var(--color-bg-default)",
            borderRadius: "var(--radius-sm)"
          }}>
                <div style={{
              fontSize: "24px",
              fontWeight: "600"
            }}>12</div>
                <div style={{
              fontSize: "12px",
              color: "var(--color-fg-muted)"
            }}>Characters</div>
              </div>
            </div>
          </div>
    }, {
      value: "details",
      label: "Details",
      content: <div style={{
        padding: "1rem"
      }}>
            <h3 style={{
          margin: "0 0 1rem",
          fontSize: "16px"
        }}>Details</h3>
            <ul style={{
          margin: 0,
          paddingLeft: "1.5rem",
          color: "var(--color-fg-muted)"
        }}>
              <li>Created: 2024-01-15</li>
              <li>Last modified: 2024-01-20</li>
              <li>Author: John Doe</li>
            </ul>
          </div>
    }]
  },
  parameters: {
    layout: "padded"
  }
}`,...b.parameters?.docs?.source},description:{story:"丰富内容面板",...b.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: [{
      value: "only",
      label: "Only Tab",
      content: <div>Single tab content</div>
    }]
  }
}`,...g.parameters?.docs?.source},description:{story:"单个标签",...g.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: [{
      value: "t1",
      label: "Tab 1",
      content: <div></div>
    }, {
      value: "t2",
      label: "Tab 2",
      content: <div>Has content</div>
    }]
  }
}`,...h.parameters?.docs?.source},description:{story:"空内容面板",...h.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: basicTabs
  },
  parameters: {
    docs: {
      description: {
        story: "使用 Tab 键聚焦到标签，用左右箭头键切换，验证 focus ring 和键盘导航"
      }
    }
  }
}`,...f.parameters?.docs?.source},description:{story:`Focus 测试

使用 Tab 键导航，验证 focus-visible 样式`,...f.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    tabs: basicTabs
  },
  parameters: {
    layout: "fullscreen"
  },
  render: () => <div style={{
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem"
  }}>
      {/* Horizontal */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Horizontal (Default)
        </h3>
        <Tabs tabs={basicTabs} />
      </section>

      {/* Vertical */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Vertical
        </h3>
        <Tabs tabs={settingsTabs} orientation="vertical" />
      </section>

      {/* With Disabled */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          With Disabled
        </h3>
        <Tabs tabs={tabsWithDisabled} />
      </section>

      {/* Full Width */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Full Width
        </h3>
        <div style={{
        maxWidth: "400px"
      }}>
          <Tabs tabs={basicTabs} fullWidth />
        </div>
      </section>
    </div>
}`,...x.parameters?.docs?.source},description:{story:"完整功能展示（用于 AI 自检）",...x.parameters?.docs?.description}}};const O=["Default","SettingsTabs","Controlled","DefaultValue","Horizontal","Vertical","WithDisabled","FullWidth","LongLabels","ManyTabs","WithIcons","RichContent","SingleTab","EmptyContent","FocusTest","FullMatrix"];export{o as Controlled,r as Default,i as DefaultValue,h as EmptyContent,f as FocusTest,x as FullMatrix,p as FullWidth,l as Horizontal,u as LongLabels,v as ManyTabs,b as RichContent,s as SettingsTabs,g as SingleTab,c as Vertical,d as WithDisabled,m as WithIcons,O as __namedExportsOrder,B as default};
