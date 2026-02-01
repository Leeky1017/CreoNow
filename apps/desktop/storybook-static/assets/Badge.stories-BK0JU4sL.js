import{j as r}from"./jsx-runtime-BLchON5X.js";import{B as s}from"./Badge-0PIbcpDO.js";import"./index-kA4PVysc.js";const z={title:"Primitives/Badge",component:s,parameters:{layout:"centered",docs:{description:{component:`Badge 组件 Story

用于显示状态标签、标签或计数。
支持多种 variant 和 size。`}}},tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","success","warning","error","info"],description:"Visual style variant"},size:{control:"select",options:["sm","md"],description:"Size of the badge"}}},a={args:{children:"Badge",variant:"default",size:"md"}},n={args:{children:"Active",variant:"success"}},i={args:{children:"Pending",variant:"warning"}},t={args:{children:"Failed",variant:"error"}},o={args:{children:"New",variant:"info"}},d={args:{children:"SM",size:"sm"}},c={args:{children:"MD",size:"md"}},v=["default","success","warning","error","info"],y=["sm","md"],p={args:{children:"Badge"},render:()=>r.jsx("div",{style:{display:"flex",gap:"0.5rem",flexWrap:"wrap"},children:v.map(e=>r.jsx(s,{variant:e,children:e},e))})},l={args:{children:"Badge"},render:()=>r.jsx("div",{style:{display:"flex",gap:"0.5rem",alignItems:"center"},children:y.map(e=>r.jsx(s,{size:e,children:e},e))})},m={args:{children:"Badge"},parameters:{layout:"padded"},render:()=>r.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:v.map(e=>r.jsxs("div",{style:{display:"flex",gap:"0.5rem",alignItems:"center"},children:[r.jsx("span",{style:{width:"60px",fontSize:"12px",color:"var(--color-fg-muted)"},children:e}),y.map(u=>r.jsx(s,{variant:e,size:u,children:u},`${e}-${u}`))]},e))})},g={args:{children:"Badge"},render:()=>r.jsxs("div",{style:{display:"flex",gap:"0.5rem"},children:[r.jsx(s,{variant:"error",size:"sm",children:"3"}),r.jsx(s,{variant:"info",size:"sm",children:"99+"}),r.jsx(s,{variant:"success",size:"sm",children:"12"})]})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Badge",
    variant: "default",
    size: "md"
  }
}`,...a.parameters?.docs?.source},description:{story:"默认状态",...a.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Active",
    variant: "success"
  }
}`,...n.parameters?.docs?.source},description:{story:"Success variant",...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Pending",
    variant: "warning"
  }
}`,...i.parameters?.docs?.source},description:{story:"Warning variant",...i.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Failed",
    variant: "error"
  }
}`,...t.parameters?.docs?.source},description:{story:"Error variant",...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    children: "New",
    variant: "info"
  }
}`,...o.parameters?.docs?.source},description:{story:"Info variant",...o.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    children: "SM",
    size: "sm"
  }
}`,...d.parameters?.docs?.source},description:{story:"Small size",...d.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    children: "MD",
    size: "md"
  }
}`,...c.parameters?.docs?.source},description:{story:"Medium size",...c.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Badge"
  },
  render: () => <div style={{
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap"
  }}>
      {variants.map(variant => <Badge key={variant} variant={variant}>
          {variant}
        </Badge>)}
    </div>
}`,...p.parameters?.docs?.source},description:{story:"所有 Variants 展示",...p.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Badge"
  },
  render: () => <div style={{
    display: "flex",
    gap: "0.5rem",
    alignItems: "center"
  }}>
      {sizes.map(size => <Badge key={size} size={size}>
          {size}
        </Badge>)}
    </div>
}`,...l.parameters?.docs?.source},description:{story:"所有 Sizes 展示",...l.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Badge"
  },
  parameters: {
    layout: "padded"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  }}>
      {variants.map(variant => <div key={variant} style={{
      display: "flex",
      gap: "0.5rem",
      alignItems: "center"
    }}>
          <span style={{
        width: "60px",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
            {variant}
          </span>
          {sizes.map(size => <Badge key={\`\${variant}-\${size}\`} variant={variant} size={size}>
              {size}
            </Badge>)}
        </div>)}
    </div>
}`,...m.parameters?.docs?.source},description:{story:"完整矩阵",...m.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Badge"
  },
  render: () => <div style={{
    display: "flex",
    gap: "0.5rem"
  }}>
      <Badge variant="error" size="sm">3</Badge>
      <Badge variant="info" size="sm">99+</Badge>
      <Badge variant="success" size="sm">12</Badge>
    </div>
}`,...g.parameters?.docs?.source},description:{story:"数字计数示例",...g.parameters?.docs?.description}}};const B=["Default","Success","Warning","Error","Info","Small","Medium","AllVariants","AllSizes","FullMatrix","NumberBadges"];export{l as AllSizes,p as AllVariants,a as Default,t as Error,m as FullMatrix,o as Info,c as Medium,g as NumberBadges,d as Small,n as Success,i as Warning,B as __namedExportsOrder,z as default};
