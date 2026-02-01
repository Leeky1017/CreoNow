import{j as e}from"./jsx-runtime-BLchON5X.js";import{S as r}from"./Spinner-BG3j59Um.js";import"./index-kA4PVysc.js";const z={title:"Primitives/Spinner",component:r,parameters:{layout:"centered",docs:{description:{component:`Spinner 组件 Story

用于显示加载状态的旋转指示器。
支持多种尺寸。`}}},tags:["autodocs"],argTypes:{size:{control:"select",options:["xs","sm","md","lg","xl"],description:"Size of the spinner"},label:{control:"text",description:"Accessibility label"}}},s={args:{size:"md"}},g=["xs","sm","md","lg","xl"],n={args:{size:"xs"}},o={args:{size:"sm"}},a={args:{size:"md"}},i={args:{size:"lg"}},t={args:{size:"xl"}},c={args:{size:"md"},render:()=>e.jsx("div",{style:{display:"flex",gap:"1.5rem",alignItems:"center"},children:g.map(m=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.5rem"},children:[e.jsx(r,{size:m}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:m})]},m))})},d={args:{size:"md"},render:()=>e.jsxs("div",{style:{display:"flex",gap:"1.5rem",alignItems:"center"},children:[e.jsx("div",{style:{color:"var(--color-fg-default)"},children:e.jsx(r,{size:"md"})}),e.jsx("div",{style:{color:"var(--color-fg-muted)"},children:e.jsx(r,{size:"md"})}),e.jsx("div",{style:{color:"var(--color-success)"},children:e.jsx(r,{size:"md"})}),e.jsx("div",{style:{color:"var(--color-error)"},children:e.jsx(r,{size:"md"})}),e.jsx("div",{style:{color:"var(--color-info)"},children:e.jsx(r,{size:"md"})})]})},l={args:{size:"sm"},render:()=>e.jsxs("button",{type:"button",style:{display:"inline-flex",alignItems:"center",gap:"0.5rem",padding:"0.5rem 1rem",backgroundColor:"var(--color-fg-default)",color:"var(--color-fg-inverse)",border:"none",borderRadius:"var(--radius-md)",fontSize:"13px",cursor:"not-allowed",opacity:.7},disabled:!0,children:[e.jsx(r,{size:"sm"}),e.jsx("span",{children:"Loading..."})]})},p={args:{size:"xl"},parameters:{layout:"fullscreen"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",gap:"1rem",color:"var(--color-fg-muted)"},children:[e.jsx(r,{size:"xl"}),e.jsx("span",{style:{fontSize:"14px"},children:"Loading content..."})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    size: "md"
  }
}`,...s.parameters?.docs?.source},description:{story:"默认状态",...s.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    size: "xs"
  }
}`,...n.parameters?.docs?.source},description:{story:"XS size (12px)",...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    size: "sm"
  }
}`,...o.parameters?.docs?.source},description:{story:"SM size (16px)",...o.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    size: "md"
  }
}`,...a.parameters?.docs?.source},description:{story:"MD size (24px)",...a.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    size: "lg"
  }
}`,...i.parameters?.docs?.source},description:{story:"LG size (32px)",...i.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    size: "xl"
  }
}`,...t.parameters?.docs?.source},description:{story:"XL size (48px)",...t.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    size: "md"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1.5rem",
    alignItems: "center"
  }}>
      {sizes.map(size => <div key={size} style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.5rem"
    }}>
          <Spinner size={size} />
          <span style={{
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
            {size}
          </span>
        </div>)}
    </div>
}`,...c.parameters?.docs?.source},description:{story:"所有 Sizes 展示",...c.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    size: "md"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1.5rem",
    alignItems: "center"
  }}>
      <div style={{
      color: "var(--color-fg-default)"
    }}>
        <Spinner size="md" />
      </div>
      <div style={{
      color: "var(--color-fg-muted)"
    }}>
        <Spinner size="md" />
      </div>
      <div style={{
      color: "var(--color-success)"
    }}>
        <Spinner size="md" />
      </div>
      <div style={{
      color: "var(--color-error)"
    }}>
        <Spinner size="md" />
      </div>
      <div style={{
      color: "var(--color-info)"
    }}>
        <Spinner size="md" />
      </div>
    </div>
}`,...d.parameters?.docs?.source},description:{story:"不同颜色（继承父元素 color）",...d.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    size: "sm"
  },
  render: () => <button type="button" style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    backgroundColor: "var(--color-fg-default)",
    color: "var(--color-fg-inverse)",
    border: "none",
    borderRadius: "var(--radius-md)",
    fontSize: "13px",
    cursor: "not-allowed",
    opacity: 0.7
  }} disabled>
      <Spinner size="sm" />
      <span>Loading...</span>
    </button>
}`,...l.parameters?.docs?.source},description:{story:"加载按钮示例",...l.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    size: "xl"
  },
  parameters: {
    layout: "fullscreen"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    gap: "1rem",
    color: "var(--color-fg-muted)"
  }}>
      <Spinner size="xl" />
      <span style={{
      fontSize: "14px"
    }}>Loading content...</span>
    </div>
}`,...p.parameters?.docs?.source},description:{story:"全屏加载示例",...p.parameters?.docs?.description}}};const v=["Default","ExtraSmall","Small","Medium","Large","ExtraLarge","AllSizes","Colors","InButton","FullScreen"];export{c as AllSizes,d as Colors,s as Default,t as ExtraLarge,n as ExtraSmall,p as FullScreen,l as InButton,i as Large,a as Medium,o as Small,v as __namedExportsOrder,z as default};
