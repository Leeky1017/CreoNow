import{j as e}from"./jsx-runtime-BLchON5X.js";import{R as y}from"./index-DDi9LDaq.js";import{R as a,a as x,b as k}from"./Radio-DYZtN_dz.js";import"./index-kA4PVysc.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-CDK04lop.js";import"./index-D6SgtPiA.js";import"./index-Dx0N0K8E.js";import"./index-CQ0IhcTf.js";import"./index-CAq0tSys.js";import"./index-CEv_TvBl.js";import"./index-Tf3TKiO9.js";import"./index-nu25GvvV.js";const $={title:"Primitives/Radio",component:a,parameters:{layout:"padded",docs:{description:{component:`Radio 组件 Story

用于单选选择。
基于 Radix UI RadioGroup。`}}},tags:["autodocs"],argTypes:{orientation:{control:"select",options:["vertical","horizontal"],description:"Orientation of the radio group"},size:{control:"select",options:["sm","md"],description:"Size of the radio buttons"},disabled:{control:"boolean",description:"Whether the group is disabled"}}},o=[{value:"light",label:"Light"},{value:"dark",label:"Dark"},{value:"system",label:"System"}],b=[{value:"free",label:"Free",description:"Basic features, up to 3 projects"},{value:"pro",label:"Pro",description:"$9.99/month, unlimited projects"},{value:"team",label:"Team",description:"$29.99/month, collaboration features"}],t={args:{options:o,defaultValue:"dark"}},s={args:{options:o,orientation:"horizontal",defaultValue:"dark"}},n={args:{options:b,defaultValue:"pro"}},i={args:{options:o,size:"sm",defaultValue:"dark"}},l={args:{options:o,disabled:!0,defaultValue:"dark"}},d={args:{options:[{value:"light",label:"Light"},{value:"dark",label:"Dark"},{value:"system",label:"System",disabled:!0}],defaultValue:"dark"}};function S(){const[r,h]=y.useState("dark");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:[e.jsxs("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:["Selected: ",r]}),e.jsx(a,{options:o,value:r,onValueChange:h})]})}const f={args:{options:o},render:()=>e.jsx(S,{})},p={args:{options:o},render:()=>e.jsxs("div",{style:{display:"flex",gap:"3rem"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Small"}),e.jsx(a,{options:o,size:"sm",defaultValue:"dark"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Medium"}),e.jsx(a,{options:o,size:"md",defaultValue:"dark"})]})]})},c={args:{options:o},render:()=>e.jsxs("form",{style:{display:"flex",flexDirection:"column",gap:"1.5rem",maxWidth:"300px",padding:"1.5rem",backgroundColor:"var(--color-bg-surface)",borderRadius:"var(--radius-lg)"},children:[e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.75rem",fontSize:"14px",fontWeight:500,color:"var(--color-fg-default)"},children:"Theme"}),e.jsx(a,{options:o,name:"theme",defaultValue:"dark"})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.75rem",fontSize:"14px",fontWeight:500,color:"var(--color-fg-default)"},children:"Plan"}),e.jsx(a,{options:b,name:"plan",defaultValue:"pro"})]})]})},v={args:{options:o},render:()=>e.jsx(x,{defaultValue:"dark",className:"grid grid-cols-3 gap-3",children:["light","dark","system"].map(r=>e.jsxs("label",{className:"flex items-center gap-3 p-3 border border-[var(--color-border-default)] rounded-[var(--radius-md)] cursor-pointer hover:bg-[var(--color-bg-hover)] has-[[data-state=checked]]:border-[var(--color-fg-default)] has-[[data-state=checked]]:bg-[var(--color-bg-hover)]",children:[e.jsx(k,{value:r}),e.jsx("span",{className:"text-sm text-[var(--color-fg-default)] capitalize",children:r})]},r))})},m={args:{options:[{value:"option1",label:"This is a very long option label that might wrap"},{value:"option2",label:"Another long option with detailed description",description:"This description provides additional context about what this option does and when you might want to select it."}]}},u={args:{options:[{value:"only",label:"Only option"}],defaultValue:"only"}},g={args:{options:Array.from({length:8},(r,h)=>({value:`option-${h+1}`,label:`Option ${h+1}`}))}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    options: themeOptions,
    defaultValue: "dark"
  }
}`,...t.parameters?.docs?.source},description:{story:"默认状态",...t.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    options: themeOptions,
    orientation: "horizontal",
    defaultValue: "dark"
  }
}`,...s.parameters?.docs?.source},description:{story:"水平布局",...s.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    options: planOptions,
    defaultValue: "pro"
  }
}`,...n.parameters?.docs?.source},description:{story:"带描述",...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    options: themeOptions,
    size: "sm",
    defaultValue: "dark"
  }
}`,...i.parameters?.docs?.source},description:{story:"小尺寸",...i.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    options: themeOptions,
    disabled: true,
    defaultValue: "dark"
  }
}`,...l.parameters?.docs?.source},description:{story:"禁用整个组",...l.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    options: [{
      value: "light",
      label: "Light"
    }, {
      value: "dark",
      label: "Dark"
    }, {
      value: "system",
      label: "System",
      disabled: true
    }],
    defaultValue: "dark"
  }
}`,...d.parameters?.docs?.source},description:{story:"禁用单个选项",...d.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    options: themeOptions
  },
  render: () => <ControlledDemo />
}`,...f.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    options: themeOptions
  },
  render: () => <div style={{
    display: "flex",
    gap: "3rem"
  }}>
      <div>
        <div style={{
        marginBottom: "0.5rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Small
        </div>
        <RadioGroup options={themeOptions} size="sm" defaultValue="dark" />
      </div>
      <div>
        <div style={{
        marginBottom: "0.5rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Medium
        </div>
        <RadioGroup options={themeOptions} size="md" defaultValue="dark" />
      </div>
    </div>
}`,...p.parameters?.docs?.source},description:{story:"所有 Sizes",...p.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    options: themeOptions
  },
  render: () => <form style={{
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "300px",
    padding: "1.5rem",
    backgroundColor: "var(--color-bg-surface)",
    borderRadius: "var(--radius-lg)"
  }}>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.75rem",
        fontSize: "14px",
        fontWeight: 500,
        color: "var(--color-fg-default)"
      }}>
          Theme
        </label>
        <RadioGroup options={themeOptions} name="theme" defaultValue="dark" />
      </div>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.75rem",
        fontSize: "14px",
        fontWeight: 500,
        color: "var(--color-fg-default)"
      }}>
          Plan
        </label>
        <RadioGroup options={planOptions} name="plan" defaultValue="pro" />
      </div>
    </form>
}`,...c.parameters?.docs?.source},description:{story:"表单中使用",...c.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    options: themeOptions
  },
  render: () => <RadioGroupRoot defaultValue="dark" className="grid grid-cols-3 gap-3">
      {["light", "dark", "system"].map(theme => <label key={theme} className="flex items-center gap-3 p-3 border border-[var(--color-border-default)] rounded-[var(--radius-md)] cursor-pointer hover:bg-[var(--color-bg-hover)] has-[[data-state=checked]]:border-[var(--color-fg-default)] has-[[data-state=checked]]:bg-[var(--color-bg-hover)]">
          <Radio value={theme} />
          <span className="text-sm text-[var(--color-fg-default)] capitalize">
            {theme}
          </span>
        </label>)}
    </RadioGroupRoot>
}`,...v.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    options: [{
      value: "option1",
      label: "This is a very long option label that might wrap"
    }, {
      value: "option2",
      label: "Another long option with detailed description",
      description: "This description provides additional context about what this option does and when you might want to select it."
    }]
  }
}`,...m.parameters?.docs?.source},description:{story:"长标签",...m.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    options: [{
      value: "only",
      label: "Only option"
    }],
    defaultValue: "only"
  }
}`,...u.parameters?.docs?.source},description:{story:"单个选项",...u.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    options: Array.from({
      length: 8
    }, (_, i) => ({
      value: \`option-\${i + 1}\`,
      label: \`Option \${i + 1}\`
    }))
  }
}`,...g.parameters?.docs?.source},description:{story:"多个选项",...g.parameters?.docs?.description}}};const M=["Default","Horizontal","WithDescriptions","Small","DisabledGroup","DisabledOption","Controlled","AllSizes","InForm","CustomLayout","LongLabels","SingleOption","ManyOptions"];export{p as AllSizes,f as Controlled,v as CustomLayout,t as Default,l as DisabledGroup,d as DisabledOption,s as Horizontal,c as InForm,m as LongLabels,g as ManyOptions,u as SingleOption,i as Small,n as WithDescriptions,M as __namedExportsOrder,$ as default};
