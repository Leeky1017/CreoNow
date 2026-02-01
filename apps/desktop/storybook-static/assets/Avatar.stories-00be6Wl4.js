import{j as r}from"./jsx-runtime-BLchON5X.js";import{A as x}from"./Avatar-CFHo7YSR.js";import"./index-kA4PVysc.js";import"./index-DDi9LDaq.js";const h={title:"Primitives/Avatar",component:x,parameters:{layout:"centered",docs:{description:{component:`Avatar 组件 Story

用于显示用户头像或占位符。
支持图片、fallback 文本（自动提取首字母）。`}}},tags:["autodocs"],argTypes:{size:{control:"select",options:["xs","sm","md","lg","xl"],description:"Size of the avatar"},src:{control:"text",description:"Image source URL"},alt:{control:"text",description:"Alt text for image"},fallback:{control:"text",description:"Fallback text (usually name, will extract initials)"}}},a={args:{fallback:"John Doe",size:"md"}},s={args:{src:"https://i.pravatar.cc/150?img=1",alt:"John Doe",size:"md"}},t={args:{fallback:"AB",size:"md"}},n={args:{fallback:"Admin",size:"md"}},i={args:{src:"https://invalid-url.example.com/image.jpg",fallback:"Error User",size:"md"}},z=["xs","sm","md","lg","xl"],c={args:{fallback:"XS",size:"xs"}},o={args:{fallback:"SM",size:"sm"}},l={args:{fallback:"MD",size:"md"}},p={args:{fallback:"LG",size:"lg"}},m={args:{fallback:"XL",size:"xl"}},d={args:{fallback:"JD"},render:()=>r.jsx("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:z.map(e=>r.jsx(x,{fallback:"John Doe",size:e},e))})},g={args:{fallback:"JD"},render:()=>r.jsx("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:z.map((e,v)=>r.jsx(x,{src:`https://i.pravatar.cc/150?img=${v+1}`,alt:`User ${e}`,size:e},e))})},u={args:{fallback:"JD"},render:()=>r.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"0.75rem"},children:[{name:"Alice Chen",src:"https://i.pravatar.cc/150?img=5"},{name:"Bob Smith",src:"https://i.pravatar.cc/150?img=8"},{name:"Carol Williams"},{name:"David"}].map(e=>r.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.75rem"},children:[r.jsx(x,{src:e.src,fallback:e.name,size:"sm"}),r.jsx("span",{style:{color:"var(--color-fg-default)",fontSize:"13px"},children:e.name})]},e.name))})},f={args:{fallback:"JD"},render:()=>r.jsx("div",{style:{display:"flex"},children:[1,2,3,4,5].map(e=>r.jsx("div",{style:{marginLeft:e===1?0:"-8px",border:"2px solid var(--color-bg-base)",borderRadius:"9999px"},children:r.jsx(x,{src:`https://i.pravatar.cc/150?img=${e+10}`,alt:`User ${e}`,size:"sm"})},e))})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "John Doe",
    size: "md"
  }
}`,...a.parameters?.docs?.source},description:{story:"默认状态（无图片）",...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    src: "https://i.pravatar.cc/150?img=1",
    alt: "John Doe",
    size: "md"
  }
}`,...s.parameters?.docs?.source},description:{story:"带图片",...s.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "AB",
    size: "md"
  }
}`,...t.parameters?.docs?.source},description:{story:"只有首字母",...t.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "Admin",
    size: "md"
  }
}`,...n.parameters?.docs?.source},description:{story:"单字名字",...n.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    src: "https://invalid-url.example.com/image.jpg",
    fallback: "Error User",
    size: "md"
  }
}`,...i.parameters?.docs?.source},description:{story:"图片加载失败时显示 fallback",...i.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "XS",
    size: "xs"
  }
}`,...c.parameters?.docs?.source},description:{story:"XS size (24px)",...c.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "SM",
    size: "sm"
  }
}`,...o.parameters?.docs?.source},description:{story:"SM size (32px)",...o.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "MD",
    size: "md"
  }
}`,...l.parameters?.docs?.source},description:{story:"MD size (40px)",...l.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "LG",
    size: "lg"
  }
}`,...p.parameters?.docs?.source},description:{story:"LG size (56px)",...p.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "XL",
    size: "xl"
  }
}`,...m.parameters?.docs?.source},description:{story:"XL size (80px)",...m.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "JD"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem",
    alignItems: "center"
  }}>
      {sizes.map(size => <Avatar key={size} fallback="John Doe" size={size} />)}
    </div>
}`,...d.parameters?.docs?.source},description:{story:"所有 Sizes 展示",...d.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "JD"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem",
    alignItems: "center"
  }}>
      {sizes.map((size, i) => <Avatar key={size} src={\`https://i.pravatar.cc/150?img=\${i + 1}\`} alt={\`User \${size}\`} size={size} />)}
    </div>
}`,...g.parameters?.docs?.source},description:{story:"带图片的所有 Sizes",...g.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "JD"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem"
  }}>
      {[{
      name: "Alice Chen",
      src: "https://i.pravatar.cc/150?img=5"
    }, {
      name: "Bob Smith",
      src: "https://i.pravatar.cc/150?img=8"
    }, {
      name: "Carol Williams"
    }, {
      name: "David"
    }].map(user => <div key={user.name} style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem"
    }}>
          <Avatar src={user.src} fallback={user.name} size="sm" />
          <span style={{
        color: "var(--color-fg-default)",
        fontSize: "13px"
      }}>
            {user.name}
          </span>
        </div>)}
    </div>
}`,...u.parameters?.docs?.source},description:{story:"用户列表示例",...u.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    fallback: "JD"
  },
  render: () => <div style={{
    display: "flex"
  }}>
      {[1, 2, 3, 4, 5].map(i => <div key={i} style={{
      marginLeft: i === 1 ? 0 : "-8px",
      border: "2px solid var(--color-bg-base)",
      borderRadius: "9999px"
    }}>
          <Avatar src={\`https://i.pravatar.cc/150?img=\${i + 10}\`} alt={\`User \${i}\`} size="sm" />
        </div>)}
    </div>
}`,...f.parameters?.docs?.source},description:{story:"头像组（重叠）",...f.parameters?.docs?.description}}};const D=["Default","WithImage","WithInitials","SingleName","ImageError","ExtraSmall","Small","Medium","Large","ExtraLarge","AllSizes","AllSizesWithImage","UserList","AvatarGroup"];export{d as AllSizes,g as AllSizesWithImage,f as AvatarGroup,a as Default,m as ExtraLarge,c as ExtraSmall,i as ImageError,p as Large,l as Medium,n as SingleName,o as Small,u as UserList,s as WithImage,t as WithInitials,D as __namedExportsOrder,h as default};
