import{j as e}from"./jsx-runtime-BLchON5X.js";import{S as r}from"./Skeleton-CwzwMFJo.js";import"./index-kA4PVysc.js";const x={title:"Primitives/Skeleton",component:r,parameters:{layout:"padded",docs:{description:{component:`Skeleton 组件 Story

用于显示内容加载占位符。
支持文本、圆形、矩形三种形态。`}}},tags:["autodocs"],argTypes:{variant:{control:"select",options:["text","circular","rectangular"],description:"Shape variant"},width:{control:"text",description:"Width (CSS value)"},height:{control:"text",description:"Height (CSS value)"},animate:{control:"boolean",description:"Enable shimmer animation"}}},t={args:{variant:"text",width:"200px"}},a={args:{variant:"text",width:"80%"}},n={args:{variant:"circular",width:48,height:48}},i={args:{variant:"rectangular",width:"100%",height:120}},s={args:{variant:"rectangular",width:200,height:100,animate:!1}},o={args:{variant:"text"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.5rem",maxWidth:"400px"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"text"}),e.jsx(r,{variant:"text",width:"80%"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"circular"}),e.jsx(r,{variant:"circular",width:48,height:48})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"rectangular"}),e.jsx(r,{variant:"rectangular",height:100})]})]})},d={args:{variant:"text"},render:()=>e.jsxs("div",{style:{display:"flex",alignItems:"flex-start",gap:"1rem",padding:"1rem",backgroundColor:"var(--color-bg-surface)",borderRadius:"var(--radius-lg)",maxWidth:"320px"},children:[e.jsx(r,{variant:"circular",width:48,height:48}),e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",gap:"0.5rem"},children:[e.jsx(r,{variant:"text",width:"60%",height:16}),e.jsx(r,{variant:"text",width:"80%",height:14}),e.jsx(r,{variant:"text",width:"40%",height:14})]})]})},c={args:{variant:"text"},render:()=>e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1.5rem",maxWidth:"500px"},children:[1,2,3].map(h=>e.jsxs("div",{style:{display:"flex",gap:"1rem",padding:"1rem",backgroundColor:"var(--color-bg-surface)",borderRadius:"var(--radius-lg)"},children:[e.jsx(r,{variant:"rectangular",width:120,height:80}),e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",gap:"0.5rem"},children:[e.jsx(r,{variant:"text",width:"90%",height:18}),e.jsx(r,{variant:"text",width:"70%",height:14}),e.jsx(r,{variant:"text",width:"50%",height:14})]})]},h))})},l={args:{variant:"text"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem",maxWidth:"300px",padding:"1.5rem",backgroundColor:"var(--color-bg-surface)",borderRadius:"var(--radius-lg)"},children:[e.jsx(r,{variant:"text",width:"30%",height:12}),e.jsx(r,{variant:"rectangular",height:36}),e.jsx(r,{variant:"text",width:"30%",height:12}),e.jsx(r,{variant:"rectangular",height:36}),e.jsx(r,{variant:"text",width:"30%",height:12}),e.jsx(r,{variant:"rectangular",height:80}),e.jsx(r,{variant:"rectangular",width:"100%",height:36})]})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "text",
    width: "200px"
  }
}`,...t.parameters?.docs?.source},description:{story:"默认状态（文本）",...t.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "text",
    width: "80%"
  }
}`,...a.parameters?.docs?.source},description:{story:"文本占位",...a.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "circular",
    width: 48,
    height: 48
  }
}`,...n.parameters?.docs?.source},description:{story:"圆形占位（头像）",...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "rectangular",
    width: "100%",
    height: 120
  }
}`,...i.parameters?.docs?.source},description:{story:"矩形占位（图片/卡片）",...i.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "rectangular",
    width: 200,
    height: 100,
    animate: false
  }
}`,...s.parameters?.docs?.source},description:{story:"无动画",...s.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "text"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "400px"
  }}>
      <div>
        <div style={{
        marginBottom: "0.5rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          text
        </div>
        <Skeleton variant="text" width="80%" />
      </div>
      <div>
        <div style={{
        marginBottom: "0.5rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          circular
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
      <div>
        <div style={{
        marginBottom: "0.5rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          rectangular
        </div>
        <Skeleton variant="rectangular" height={100} />
      </div>
    </div>
}`,...o.parameters?.docs?.source},description:{story:"所有 Variants 展示",...o.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "text"
  },
  render: () => <div style={{
    display: "flex",
    alignItems: "flex-start",
    gap: "1rem",
    padding: "1rem",
    backgroundColor: "var(--color-bg-surface)",
    borderRadius: "var(--radius-lg)",
    maxWidth: "320px"
  }}>
      <Skeleton variant="circular" width={48} height={48} />
      <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem"
    }}>
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="text" width="80%" height={14} />
        <Skeleton variant="text" width="40%" height={14} />
      </div>
    </div>
}`,...d.parameters?.docs?.source},description:{story:"用户卡片骨架",...d.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "text"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    maxWidth: "500px"
  }}>
      {[1, 2, 3].map(i => <div key={i} style={{
      display: "flex",
      gap: "1rem",
      padding: "1rem",
      backgroundColor: "var(--color-bg-surface)",
      borderRadius: "var(--radius-lg)"
    }}>
          <Skeleton variant="rectangular" width={120} height={80} />
          <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem"
      }}>
            <Skeleton variant="text" width="90%" height={18} />
            <Skeleton variant="text" width="70%" height={14} />
            <Skeleton variant="text" width="50%" height={14} />
          </div>
        </div>)}
    </div>
}`,...c.parameters?.docs?.source},description:{story:"文章列表骨架",...c.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "text"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxWidth: "300px",
    padding: "1.5rem",
    backgroundColor: "var(--color-bg-surface)",
    borderRadius: "var(--radius-lg)"
  }}>
      <Skeleton variant="text" width="30%" height={12} />
      <Skeleton variant="rectangular" height={36} />
      <Skeleton variant="text" width="30%" height={12} />
      <Skeleton variant="rectangular" height={36} />
      <Skeleton variant="text" width="30%" height={12} />
      <Skeleton variant="rectangular" height={80} />
      <Skeleton variant="rectangular" width="100%" height={36} />
    </div>
}`,...l.parameters?.docs?.source},description:{story:"表单骨架",...l.parameters?.docs?.description}}};const v=["Default","Text","Circular","Rectangular","NoAnimation","AllVariants","UserCardSkeleton","ArticleListSkeleton","FormSkeleton"];export{o as AllVariants,c as ArticleListSkeleton,n as Circular,t as Default,l as FormSkeleton,s as NoAnimation,i as Rectangular,a as Text,d as UserCardSkeleton,v as __namedExportsOrder,x as default};
