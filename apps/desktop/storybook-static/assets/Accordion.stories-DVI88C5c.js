import{j as e}from"./jsx-runtime-BLchON5X.js";import{R as f}from"./index-DDi9LDaq.js";import{A as y}from"./Accordion-F8I8yqG1.js";import"./index-kA4PVysc.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-D6SgtPiA.js";import"./index-nu25GvvV.js";import"./index-Dx0N0K8E.js";import"./index-CAq0tSys.js";const E={title:"Primitives/Accordion",component:y,parameters:{layout:"padded",docs:{description:{component:`Accordion 组件 Story

用于显示可折叠的内容区域。
基于 Radix UI Accordion。`}}},tags:["autodocs"],argTypes:{type:{control:"select",options:["single","multiple"],description:"Single or multiple items can be open"},collapsible:{control:"boolean",description:"Whether items can be collapsed (single type only)"}}},t=[{value:"item-1",title:"What is CreoNow?",content:"CreoNow is an AI-powered creative writing IDE designed for authors and content creators."},{value:"item-2",title:"How does AI assistance work?",content:"The AI analyzes your writing context and provides suggestions, helps with brainstorming, and can generate draft content based on your specifications."},{value:"item-3",title:"Is my data secure?",content:"Yes, all your writing is stored locally on your device. We do not store any of your content on our servers unless you explicitly choose to sync."}],s={args:{items:t,type:"single",collapsible:!0}},r={args:{items:t,type:"multiple"}},o={args:{items:t,type:"single",defaultValue:"item-1"}},i={args:{items:t,type:"single",collapsible:!1,defaultValue:"item-1"}},a={args:{items:[...t,{value:"item-4",title:"Disabled Section",content:"This content is not accessible.",disabled:!0}],type:"single"}},l={args:{items:[{value:"features",title:"Features",content:e.jsxs("ul",{style:{margin:0,paddingLeft:"1.5rem"},children:[e.jsx("li",{children:"AI-powered writing assistance"}),e.jsx("li",{children:"Character and world management"}),e.jsx("li",{children:"Version history and branching"}),e.jsx("li",{children:"Export to multiple formats"})]})},{value:"pricing",title:"Pricing",content:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Free:"})," Basic features, up to 3 projects"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Pro:"})," $9.99/month, unlimited projects + AI"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Team:"})," $29.99/month, collaboration features"]})]})},{value:"support",title:"Support",content:e.jsxs("p",{style:{margin:0},children:["For support, please email"," ",e.jsx("span",{style:{color:"var(--color-accent)"},children:"support@creonow.app"})," or visit our Discord community."]})}],type:"single"}},c={args:{items:t,type:"multiple",defaultValue:["item-1","item-2"]}};function v(){const[g,n]=f.useState("item-1");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:[e.jsxs("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:["Current: ",g||"none"]}),e.jsx(y,{items:t,type:"single",value:g,onValueChange:h=>n(h),collapsible:!0})]})}const u={args:{items:t},render:()=>e.jsx(v,{})},p={args:{items:[{value:"long",title:"This is a very long title that might need to wrap to multiple lines in narrow containers",content:"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."}],type:"single",defaultValue:"long"}},m={args:{items:[{value:"only",title:"Only Section",content:"This accordion has only one item."}],type:"single"}},d={args:{items:Array.from({length:10},(g,n)=>({value:`item-${n+1}`,title:`Section ${n+1}`,content:`Content for section ${n+1}. This is some placeholder text.`})),type:"single"}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    items: sampleItems,
    type: "single",
    collapsible: true
  }
}`,...s.parameters?.docs?.source},description:{story:"默认状态 (single)",...s.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    items: sampleItems,
    type: "multiple"
  }
}`,...r.parameters?.docs?.source},description:{story:"多选模式",...r.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    items: sampleItems,
    type: "single",
    defaultValue: "item-1"
  }
}`,...o.parameters?.docs?.source},description:{story:"默认展开",...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    items: sampleItems,
    type: "single",
    collapsible: false,
    defaultValue: "item-1"
  }
}`,...i.parameters?.docs?.source},description:{story:"不可折叠",...i.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    items: [...sampleItems, {
      value: "item-4",
      title: "Disabled Section",
      content: "This content is not accessible.",
      disabled: true
    }],
    type: "single"
  }
}`,...a.parameters?.docs?.source},description:{story:"禁用项",...a.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    items: [{
      value: "features",
      title: "Features",
      content: <ul style={{
        margin: 0,
        paddingLeft: "1.5rem"
      }}>
            <li>AI-powered writing assistance</li>
            <li>Character and world management</li>
            <li>Version history and branching</li>
            <li>Export to multiple formats</li>
          </ul>
    }, {
      value: "pricing",
      title: "Pricing",
      content: <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem"
      }}>
            <div>
              <strong>Free:</strong> Basic features, up to 3 projects
            </div>
            <div>
              <strong>Pro:</strong> $9.99/month, unlimited projects + AI
            </div>
            <div>
              <strong>Team:</strong> $29.99/month, collaboration features
            </div>
          </div>
    }, {
      value: "support",
      title: "Support",
      content: <p style={{
        margin: 0
      }}>
            For support, please email{" "}
            <span style={{
          color: "var(--color-accent)"
        }}>support@creonow.app</span> or
            visit our Discord community.
          </p>
    }],
    type: "single"
  }
}`,...l.parameters?.docs?.source},description:{story:"富文本内容",...l.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    items: sampleItems,
    type: "multiple",
    defaultValue: ["item-1", "item-2"]
  }
}`,...c.parameters?.docs?.source},description:{story:"多选默认展开多项",...c.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    items: sampleItems
  },
  render: () => <ControlledDemo />
}`,...u.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    items: [{
      value: "long",
      title: "This is a very long title that might need to wrap to multiple lines in narrow containers",
      content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    }],
    type: "single",
    defaultValue: "long"
  }
}`,...p.parameters?.docs?.source},description:{story:"长标题和内容",...p.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    items: [{
      value: "only",
      title: "Only Section",
      content: "This accordion has only one item."
    }],
    type: "single"
  }
}`,...m.parameters?.docs?.source},description:{story:"单项",...m.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    items: Array.from({
      length: 10
    }, (_, i) => ({
      value: \`item-\${i + 1}\`,
      title: \`Section \${i + 1}\`,
      content: \`Content for section \${i + 1}. This is some placeholder text.\`
    })),
    type: "single"
  }
}`,...d.parameters?.docs?.source},description:{story:"多项",...d.parameters?.docs?.description}}};const q=["Default","Multiple","DefaultExpanded","NotCollapsible","WithDisabled","RichContent","MultipleDefaultExpanded","Controlled","LongContent","SingleItem","ManyItems"];export{u as Controlled,s as Default,o as DefaultExpanded,p as LongContent,d as ManyItems,r as Multiple,c as MultipleDefaultExpanded,i as NotCollapsible,l as RichContent,m as SingleItem,a as WithDisabled,q as __namedExportsOrder,E as default};
