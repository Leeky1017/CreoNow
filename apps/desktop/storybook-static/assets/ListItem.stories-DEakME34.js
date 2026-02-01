import{j as e}from"./jsx-runtime-BLchON5X.js";import{r as w}from"./index-DDi9LDaq.js";import{L as t}from"./ListItem-CyD6nTsv.js";import"./index-kA4PVysc.js";const T={title:"Primitives/ListItem",component:t,parameters:{layout:"centered",docs:{description:{component:`ListItem 组件 Story

设计规范 §6.4
列表项组件，用于列表、树形结构和菜单。

状态矩阵（MUST 全部实现）：
- default: 正常状态
- hover: 悬停状态（interactive 时）
- active: 按下状态（interactive 时）
- selected: 选中状态
- focus-visible: 键盘聚焦状态
- disabled: 禁用状态

尺寸：
- standard: 40px 高度（默认）
- compact: 32px 高度`}}},tags:["autodocs"],argTypes:{selected:{control:"boolean",description:"Item is selected/active"},compact:{control:"boolean",description:"Use compact height (32px)"},interactive:{control:"boolean",description:"Make item clickable with hover states"},disabled:{control:"boolean",description:"Disable the item"}}},c={args:{children:"List Item"}},o={args:{children:"Clickable Item",interactive:!0}},d={args:{children:"Selected Item",selected:!0,interactive:!0}},l={args:{children:"Compact Item",compact:!0}},p={args:{children:"Disabled Item",disabled:!0,interactive:!0}},m={args:{children:"Item"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem",width:"200px"},children:[e.jsxs("div",{children:[e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Standard (40px):"}),e.jsx(t,{interactive:!0,children:"Standard Height Item"})]}),e.jsxs("div",{children:[e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Compact (32px):"}),e.jsx(t,{compact:!0,interactive:!0,children:"Compact Height Item"})]})]})},h={args:{children:"Item"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.25rem",width:"200px"},children:[e.jsx(t,{children:"Static (non-interactive)"}),e.jsx(t,{interactive:!0,children:"Interactive (hover me)"}),e.jsx(t,{interactive:!0,selected:!0,children:"Selected"}),e.jsx(t,{interactive:!0,disabled:!0,children:"Disabled"}),e.jsx(t,{compact:!0,interactive:!0,children:"Compact Interactive"}),e.jsx(t,{compact:!0,selected:!0,interactive:!0,children:"Compact Selected"})]})},u={args:{children:"Item with icon",interactive:!0},render:()=>e.jsx("div",{style:{width:"200px"},children:e.jsxs(t,{interactive:!0,children:[e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"currentColor",style:{opacity:.6},children:e.jsx("path",{d:"M1 3.5A1.5 1.5 0 0 1 2.5 2h3.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H13.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z"})}),e.jsx("span",{children:"Documents"})]})})},v={args:{children:"Item with badge",interactive:!0},render:()=>e.jsx("div",{style:{width:"200px"},children:e.jsxs(t,{interactive:!0,style:{justifyContent:"space-between"},children:[e.jsx("span",{children:"Notifications"}),e.jsx("span",{style:{padding:"2px 6px",fontSize:"11px",fontWeight:500,background:"var(--color-accent)",color:"white",borderRadius:"10px"},children:"5"})]})})},x={args:{children:"File"},render:function(){const[r,a]=w.useState("doc1"),i=[{id:"doc1",name:"Chapter 1.md",icon:"📄"},{id:"doc2",name:"Chapter 2.md",icon:"📄"},{id:"doc3",name:"Characters.md",icon:"👥"},{id:"notes",name:"Notes",icon:"📁"}];return e.jsx("div",{style:{width:"220px",padding:"4px"},children:i.map(n=>e.jsxs(t,{compact:!0,interactive:!0,selected:r===n.id,onClick:()=>a(n.id),children:[e.jsx("span",{children:n.icon}),e.jsx("span",{children:n.name})]},n.id))})}},g={args:{children:"Menu Item"},render:()=>e.jsxs("div",{style:{width:"180px",padding:"4px",background:"var(--color-bg-raised)",border:"1px solid var(--color-border-default)",borderRadius:"var(--radius-md)"},children:[e.jsx(t,{compact:!0,interactive:!0,children:e.jsx("span",{children:"Edit"})}),e.jsx(t,{compact:!0,interactive:!0,children:e.jsx("span",{children:"Duplicate"})}),e.jsx(t,{compact:!0,interactive:!0,children:e.jsx("span",{children:"Move to..."})}),e.jsx("div",{style:{height:"1px",margin:"4px 0",background:"var(--color-separator)"}}),e.jsx(t,{compact:!0,interactive:!0,style:{color:"var(--color-error)"},children:e.jsx("span",{children:"Delete"})})]})},y={args:{children:"Setting"},render:function(){const[r,a]=w.useState("general"),i=[{id:"general",label:"General"},{id:"appearance",label:"Appearance"},{id:"editor",label:"Editor"},{id:"ai",label:"AI Settings"},{id:"shortcuts",label:"Keyboard Shortcuts"}];return e.jsx("div",{style:{width:"200px"},children:i.map(n=>e.jsx(t,{interactive:!0,selected:r===n.id,onClick:()=>a(n.id),children:n.label},n.id))})}},I={args:{children:"This is a very long list item text that might overflow the container",interactive:!0},decorators:[s=>e.jsx("div",{style:{width:"200px"},children:e.jsx(s,{})})]},f={args:{children:"Hi",interactive:!0}},S={args:{children:"Nested",interactive:!0},render:()=>e.jsx("div",{style:{width:"250px"},children:e.jsx(t,{interactive:!0,children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"2px"},children:[e.jsx("span",{style:{fontWeight:500},children:"Primary Text"}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Secondary description"})]})})})},j={args:{children:"Focus"},parameters:{docs:{description:{story:"使用 Tab 键在列表项之间导航，验证 focus ring 样式"}}},render:()=>e.jsxs("div",{style:{width:"200px"},children:[e.jsx(t,{interactive:!0,children:"First Item (Tab here)"}),e.jsx(t,{interactive:!0,children:"Second Item"}),e.jsx(t,{interactive:!0,children:"Third Item"})]})},b={args:{children:"Keyboard"},render:function(){const[r,a]=w.useState(null);return e.jsxs("div",{style:{width:"200px"},children:[e.jsxs("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:["Clicked: ",r??"none"]}),["Item 1","Item 2","Item 3"].map(i=>e.jsx(t,{interactive:!0,selected:r===i,onClick:()=>a(i),children:i},i)),e.jsx("div",{style:{marginTop:"0.5rem",fontSize:"11px",color:"var(--color-fg-subtle)"},children:"Try Tab, Enter, and Space keys"})]})}},L={args:{children:"Item"},parameters:{layout:"fullscreen"},render:()=>e.jsxs("div",{style:{padding:"2rem",display:"flex",flexDirection:"column",gap:"2rem"},children:[e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"State Variants"}),e.jsxs("div",{style:{width:"200px"},children:[e.jsx(t,{children:"Static"}),e.jsx(t,{interactive:!0,children:"Interactive"}),e.jsx(t,{interactive:!0,selected:!0,children:"Selected"}),e.jsx(t,{interactive:!0,disabled:!0,children:"Disabled"})]})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Size Variants"}),e.jsxs("div",{style:{width:"200px"},children:[e.jsx(t,{interactive:!0,children:"Standard (40px)"}),e.jsx(t,{compact:!0,interactive:!0,children:"Compact (32px)"})]})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"With Content"}),e.jsxs("div",{style:{width:"220px"},children:[e.jsxs(t,{interactive:!0,children:[e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 16 16",fill:"currentColor",children:e.jsx("path",{d:"M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0z"})}),e.jsx("span",{children:"With Icon"})]}),e.jsxs(t,{interactive:!0,style:{justifyContent:"space-between"},children:[e.jsx("span",{children:"With Badge"}),e.jsx("span",{style:{padding:"2px 6px",fontSize:"11px",background:"var(--color-accent)",color:"white",borderRadius:"10px"},children:"3"})]})]})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Interactive List"}),e.jsx("div",{style:{width:"200px",padding:"4px",background:"var(--color-bg-surface)",borderRadius:"var(--radius-md)"},children:["Home","Documents","Settings","Help"].map((s,r)=>e.jsx(t,{compact:!0,interactive:!0,selected:r===1,children:s},s))})]})]})};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    children: "List Item"
  }
}`,...c.parameters?.docs?.source},description:{story:"默认 ListItem",...c.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Clickable Item",
    interactive: true
  }
}`,...o.parameters?.docs?.source},description:{story:"Interactive ListItem",...o.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Selected Item",
    selected: true,
    interactive: true
  }
}`,...d.parameters?.docs?.source},description:{story:"Selected ListItem",...d.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Compact Item",
    compact: true
  }
}`,...l.parameters?.docs?.source},description:{story:"Compact ListItem",...l.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Disabled Item",
    disabled: true,
    interactive: true
  }
}`,...p.parameters?.docs?.source},description:{story:"Disabled ListItem",...p.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Item"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    width: "200px"
  }}>
      <div>
        <span style={{
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Standard (40px):
        </span>
        <ListItem interactive>Standard Height Item</ListItem>
      </div>
      <div>
        <span style={{
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Compact (32px):
        </span>
        <ListItem compact interactive>
          Compact Height Item
        </ListItem>
      </div>
    </div>
}`,...m.parameters?.docs?.source},description:{story:"尺寸比较",...m.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Item"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
    width: "200px"
  }}>
      <ListItem>Static (non-interactive)</ListItem>
      <ListItem interactive>Interactive (hover me)</ListItem>
      <ListItem interactive selected>
        Selected
      </ListItem>
      <ListItem interactive disabled>
        Disabled
      </ListItem>
      <ListItem compact interactive>
        Compact Interactive
      </ListItem>
      <ListItem compact selected interactive>
        Compact Selected
      </ListItem>
    </div>
}`,...h.parameters?.docs?.source},description:{story:"所有状态",...h.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Item with icon",
    interactive: true
  },
  render: () => <div style={{
    width: "200px"
  }}>
      <ListItem interactive>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{
        opacity: 0.6
      }}>
          <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H13.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9z" />
        </svg>
        <span>Documents</span>
      </ListItem>
    </div>
}`,...u.parameters?.docs?.source},description:{story:"带前置图标",...u.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Item with badge",
    interactive: true
  },
  render: () => <div style={{
    width: "200px"
  }}>
      <ListItem interactive style={{
      justifyContent: "space-between"
    }}>
        <span>Notifications</span>
        <span style={{
        padding: "2px 6px",
        fontSize: "11px",
        fontWeight: 500,
        background: "var(--color-accent)",
        color: "white",
        borderRadius: "10px"
      }}>
          5
        </span>
      </ListItem>
    </div>
}`,...v.parameters?.docs?.source},description:{story:"带徽章/计数",...v.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    children: "File"
  },
  render: function Render() {
    const [selected, setSelected] = useState("doc1");
    const files = [{
      id: "doc1",
      name: "Chapter 1.md",
      icon: "📄"
    }, {
      id: "doc2",
      name: "Chapter 2.md",
      icon: "📄"
    }, {
      id: "doc3",
      name: "Characters.md",
      icon: "👥"
    }, {
      id: "notes",
      name: "Notes",
      icon: "📁"
    }];
    return <div style={{
      width: "220px",
      padding: "4px"
    }}>
        {files.map(file => <ListItem key={file.id} compact interactive selected={selected === file.id} onClick={() => setSelected(file.id)}>
            <span>{file.icon}</span>
            <span>{file.name}</span>
          </ListItem>)}
      </div>;
  }
}`,...x.parameters?.docs?.source},description:{story:"文件列表",...x.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Menu Item"
  },
  render: () => <div style={{
    width: "180px",
    padding: "4px",
    background: "var(--color-bg-raised)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-md)"
  }}>
      <ListItem compact interactive>
        <span>Edit</span>
      </ListItem>
      <ListItem compact interactive>
        <span>Duplicate</span>
      </ListItem>
      <ListItem compact interactive>
        <span>Move to...</span>
      </ListItem>
      <div style={{
      height: "1px",
      margin: "4px 0",
      background: "var(--color-separator)"
    }} />
      <ListItem compact interactive style={{
      color: "var(--color-error)"
    }}>
        <span>Delete</span>
      </ListItem>
    </div>
}`,...g.parameters?.docs?.source},description:{story:"菜单列表",...g.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Setting"
  },
  render: function Render() {
    const [selected, setSelected] = useState("general");
    const settings = [{
      id: "general",
      label: "General"
    }, {
      id: "appearance",
      label: "Appearance"
    }, {
      id: "editor",
      label: "Editor"
    }, {
      id: "ai",
      label: "AI Settings"
    }, {
      id: "shortcuts",
      label: "Keyboard Shortcuts"
    }];
    return <div style={{
      width: "200px"
    }}>
        {settings.map(setting => <ListItem key={setting.id} interactive selected={selected === setting.id} onClick={() => setSelected(setting.id)}>
            {setting.label}
          </ListItem>)}
      </div>;
  }
}`,...y.parameters?.docs?.source},description:{story:"设置列表",...y.parameters?.docs?.description}}};I.parameters={...I.parameters,docs:{...I.parameters?.docs,source:{originalSource:`{
  args: {
    children: "This is a very long list item text that might overflow the container",
    interactive: true
  },
  decorators: [Story => <div style={{
    width: "200px"
  }}>
        <Story />
      </div>]
}`,...I.parameters?.docs?.source},description:{story:"长文本",...I.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Hi",
    interactive: true
  }
}`,...f.parameters?.docs?.source},description:{story:"短文本",...f.parameters?.docs?.description}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Nested",
    interactive: true
  },
  render: () => <div style={{
    width: "250px"
  }}>
      <ListItem interactive>
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "2px"
      }}>
          <span style={{
          fontWeight: 500
        }}>Primary Text</span>
          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>
            Secondary description
          </span>
        </div>
      </ListItem>
    </div>
}`,...S.parameters?.docs?.source},description:{story:"嵌套内容",...S.parameters?.docs?.description}}};j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Focus"
  },
  parameters: {
    docs: {
      description: {
        story: "使用 Tab 键在列表项之间导航，验证 focus ring 样式"
      }
    }
  },
  render: () => <div style={{
    width: "200px"
  }}>
      <ListItem interactive>First Item (Tab here)</ListItem>
      <ListItem interactive>Second Item</ListItem>
      <ListItem interactive>Third Item</ListItem>
    </div>
}`,...j.parameters?.docs?.source},description:{story:`Focus 测试

使用 Tab 键导航，验证 focus-visible 样式`,...j.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Keyboard"
  },
  render: function Render() {
    const [clicked, setClicked] = useState<string | null>(null);
    return <div style={{
      width: "200px"
    }}>
        <div style={{
        marginBottom: "0.5rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Clicked: {clicked ?? "none"}
        </div>
        {["Item 1", "Item 2", "Item 3"].map(item => <ListItem key={item} interactive selected={clicked === item} onClick={() => setClicked(item)}>
            {item}
          </ListItem>)}
        <div style={{
        marginTop: "0.5rem",
        fontSize: "11px",
        color: "var(--color-fg-subtle)"
      }}>
          Try Tab, Enter, and Space keys
        </div>
      </div>;
  }
}`,...b.parameters?.docs?.source},description:{story:"键盘交互",...b.parameters?.docs?.description}}};L.parameters={...L.parameters,docs:{...L.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Item"
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
      {/* States */}
      <section>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          State Variants
        </h3>
        <div style={{
        width: "200px"
      }}>
          <ListItem>Static</ListItem>
          <ListItem interactive>Interactive</ListItem>
          <ListItem interactive selected>
            Selected
          </ListItem>
          <ListItem interactive disabled>
            Disabled
          </ListItem>
        </div>
      </section>

      {/* Sizes */}
      <section>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Size Variants
        </h3>
        <div style={{
        width: "200px"
      }}>
          <ListItem interactive>Standard (40px)</ListItem>
          <ListItem compact interactive>
            Compact (32px)
          </ListItem>
        </div>
      </section>

      {/* With Content */}
      <section>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          With Content
        </h3>
        <div style={{
        width: "220px"
      }}>
          <ListItem interactive>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0z" />
            </svg>
            <span>With Icon</span>
          </ListItem>
          <ListItem interactive style={{
          justifyContent: "space-between"
        }}>
            <span>With Badge</span>
            <span style={{
            padding: "2px 6px",
            fontSize: "11px",
            background: "var(--color-accent)",
            color: "white",
            borderRadius: "10px"
          }}>
              3
            </span>
          </ListItem>
        </div>
      </section>

      {/* Interactive List */}
      <section>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Interactive List
        </h3>
        <div style={{
        width: "200px",
        padding: "4px",
        background: "var(--color-bg-surface)",
        borderRadius: "var(--radius-md)"
      }}>
          {["Home", "Documents", "Settings", "Help"].map((item, i) => <ListItem key={item} compact interactive selected={i === 1}>
              {item}
            </ListItem>)}
        </div>
      </section>
    </div>
}`,...L.parameters?.docs?.source},description:{story:"完整功能展示（用于 AI 自检）",...L.parameters?.docs?.description}}};const A=["Default","Interactive","Selected","Compact","Disabled","SizeComparison","AllStates","WithIcon","WithBadge","FileList","MenuList","SettingsList","LongText","ShortText","NestedContent","FocusTest","KeyboardInteraction","FullMatrix"];export{h as AllStates,l as Compact,c as Default,p as Disabled,x as FileList,j as FocusTest,L as FullMatrix,o as Interactive,b as KeyboardInteraction,I as LongText,g as MenuList,S as NestedContent,d as Selected,y as SettingsList,f as ShortText,m as SizeComparison,v as WithBadge,u as WithIcon,A as __namedExportsOrder,T as default};
