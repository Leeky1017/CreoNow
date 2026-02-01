import{j as e}from"./jsx-runtime-BLchON5X.js";import{r as P}from"./index-DDi9LDaq.js";import{P as r,a as S}from"./Popover-BMinsKFS.js";import{B as n}from"./Button-B9XLIlTV.js";import"./index-kA4PVysc.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-c9SlT_P8.js";import"./index-Dx0N0K8E.js";import"./index-wwK3GREC.js";import"./index-CEv_TvBl.js";import"./index-nu25GvvV.js";const F={title:"Primitives/Popover",component:r,parameters:{layout:"centered",docs:{description:{component:`Popover 组件 Story

设计规范 §5.2
浮动弹出层组件，基于 Radix UI Popover 原语构建。
z-index: popover (300)，shadow: md。

状态矩阵（MUST 全部实现）：
- open/closed: 弹出层显示/隐藏
- side: top/right/bottom/left 四个方向
- align: start/center/end 三种对齐
- controlled: 受控模式
- uncontrolled: 非受控模式（defaultOpen）`}}},tags:["autodocs"],argTypes:{side:{control:"select",options:["top","right","bottom","left"],description:"Preferred side of the trigger"},align:{control:"select",options:["start","center","end"],description:"Alignment relative to trigger"},sideOffset:{control:"number",description:"Offset from trigger in pixels"}}},s={args:{trigger:e.jsx(n,{children:"Open Popover"}),children:e.jsx("div",{children:"Popover content"})}},d={args:{trigger:e.jsx(n,{children:"Controlled"}),children:e.jsx("div",{children:"Controlled popover"})},render:function(){const[t,o]=P.useState(!1);return e.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:[e.jsx(r,{open:t,onOpenChange:o,trigger:e.jsx(n,{children:"Controlled"}),children:e.jsxs("div",{children:[e.jsx("p",{style:{marginBottom:"0.5rem"},children:"Controlled popover content"}),e.jsx(n,{size:"sm",onClick:()=>o(!1),children:"Close"})]})}),e.jsxs("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:["Open: ",t?"true":"false"]})]})}},a={args:{trigger:e.jsx(n,{children:"Already Open"}),children:e.jsx("div",{children:"This popover is open by default"}),defaultOpen:!0}},l={args:{trigger:e.jsx(n,{children:"Top"}),children:e.jsx("div",{children:"Popover on top"}),side:"top"}},p={args:{trigger:e.jsx(n,{children:"Right"}),children:e.jsx("div",{children:"Popover on right"}),side:"right"}},c={args:{trigger:e.jsx(n,{children:"Bottom"}),children:e.jsx("div",{children:"Popover on bottom"}),side:"bottom"}},g={args:{trigger:e.jsx(n,{children:"Left"}),children:e.jsx("div",{children:"Popover on left"}),side:"left"}},v={args:{trigger:e.jsx(n,{children:"Trigger"}),children:e.jsx("div",{children:"Content"})},parameters:{layout:"padded"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:"1rem",padding:"4rem"},children:[e.jsx(r,{trigger:e.jsx(n,{children:"Top"}),side:"top",children:e.jsx("div",{children:"Top popover"})}),e.jsxs("div",{style:{display:"flex",gap:"4rem"},children:[e.jsx(r,{trigger:e.jsx(n,{children:"Left"}),side:"left",children:e.jsx("div",{children:"Left popover"})}),e.jsx(r,{trigger:e.jsx(n,{children:"Right"}),side:"right",children:e.jsx("div",{children:"Right popover"})})]}),e.jsx(r,{trigger:e.jsx(n,{children:"Bottom"}),side:"bottom",children:e.jsx("div",{children:"Bottom popover"})})]})},h={args:{trigger:e.jsx(n,{children:"Trigger"}),children:e.jsx("div",{children:"Content"})},render:()=>e.jsxs("div",{style:{display:"flex",gap:"2rem",padding:"2rem"},children:[e.jsx(r,{trigger:e.jsx(n,{children:"Start"}),align:"start",children:e.jsx("div",{style:{width:"150px"},children:"Aligned to start"})}),e.jsx(r,{trigger:e.jsx(n,{children:"Center"}),align:"center",children:e.jsx("div",{style:{width:"150px"},children:"Aligned to center"})}),e.jsx(r,{trigger:e.jsx(n,{children:"End"}),align:"end",children:e.jsx("div",{style:{width:"150px"},children:"Aligned to end"})})]})},m={args:{trigger:e.jsx(n,{variant:"ghost",children:"Options"}),children:e.jsx("div",{children:"Menu items"})},render:()=>e.jsx(r,{trigger:e.jsx(n,{variant:"ghost",children:"Options"}),children:e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"2px",margin:"-8px"},children:["Edit","Duplicate","Archive","Delete"].map(i=>e.jsx(S,{asChild:!0,children:e.jsx("button",{style:{display:"block",width:"100%",padding:"8px 12px",textAlign:"left",border:"none",background:"transparent",cursor:"pointer",fontSize:"13px",color:i==="Delete"?"var(--color-error)":"var(--color-fg-default)"},onMouseOver:t=>{t.currentTarget.style.background="var(--color-bg-hover)"},onMouseOut:t=>{t.currentTarget.style.background="transparent"},children:i})},i))})})},x={args:{trigger:e.jsx(n,{variant:"ghost",children:"Info"}),children:e.jsx("div",{children:"Info content"})},render:()=>e.jsx(r,{trigger:e.jsx(n,{variant:"ghost",children:"User Info"}),side:"right",children:e.jsxs("div",{style:{width:"200px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px"},children:[e.jsx("div",{style:{width:"40px",height:"40px",borderRadius:"50%",background:"var(--color-accent)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:"600"},children:"JD"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:"500",fontSize:"14px"},children:"John Doe"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"john@example.com"})]})]}),e.jsx("div",{style:{borderTop:"1px solid var(--color-separator)",paddingTop:"12px",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Last active 2 hours ago"})]})})},u={args:{trigger:e.jsx(n,{children:"Add Tag"}),children:e.jsx("div",{children:"Form"})},render:function(){const[t,o]=P.useState(!1);return e.jsx(r,{open:t,onOpenChange:o,trigger:e.jsx(n,{children:"Add Tag"}),children:e.jsxs("div",{style:{width:"200px"},children:[e.jsx("div",{style:{marginBottom:"8px",fontSize:"13px",fontWeight:"500"},children:"New Tag"}),e.jsx("input",{type:"text",placeholder:"Enter tag name...",style:{width:"100%",padding:"8px 12px",border:"1px solid var(--color-border-default)",borderRadius:"var(--radius-sm)",fontSize:"13px",marginBottom:"12px"}}),e.jsxs("div",{style:{display:"flex",gap:"8px",justifyContent:"flex-end"},children:[e.jsx(n,{size:"sm",variant:"ghost",onClick:()=>o(!1),children:"Cancel"}),e.jsx(n,{size:"sm",variant:"primary",onClick:()=>o(!1),children:"Add"})]})]})})}},f={args:{trigger:e.jsx(n,{children:"Large Offset"}),children:e.jsx("div",{children:"20px offset from trigger"}),sideOffset:20}},y={args:{trigger:e.jsx(n,{children:"Minimal"}),children:e.jsx("span",{children:"Hi"})}},j={args:{trigger:e.jsx(n,{children:"Wide"}),children:e.jsx("div",{style:{width:"300px"},children:"This is a wider popover that contains more content and might need more space to display properly."})}},B={args:{trigger:e.jsx(n,{children:"Trigger"}),children:e.jsx("div",{children:"Content"})},parameters:{layout:"fullscreen"},render:()=>e.jsxs("div",{style:{padding:"4rem",display:"flex",flexDirection:"column",gap:"2rem"},children:[e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Side Variants"}),e.jsxs("div",{style:{display:"flex",gap:"1rem"},children:[e.jsx(r,{trigger:e.jsx(n,{children:"Top"}),side:"top",children:e.jsx("div",{children:"Top popover"})}),e.jsx(r,{trigger:e.jsx(n,{children:"Right"}),side:"right",children:e.jsx("div",{children:"Right popover"})}),e.jsx(r,{trigger:e.jsx(n,{children:"Bottom"}),side:"bottom",children:e.jsx("div",{children:"Bottom popover"})}),e.jsx(r,{trigger:e.jsx(n,{children:"Left"}),side:"left",children:e.jsx("div",{children:"Left popover"})})]})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Align Variants"}),e.jsxs("div",{style:{display:"flex",gap:"1rem"},children:[e.jsx(r,{trigger:e.jsx(n,{children:"Start"}),align:"start",children:e.jsx("div",{style:{width:"150px"},children:"Aligned start"})}),e.jsx(r,{trigger:e.jsx(n,{children:"Center"}),align:"center",children:e.jsx("div",{style:{width:"150px"},children:"Aligned center"})}),e.jsx(r,{trigger:e.jsx(n,{children:"End"}),align:"end",children:e.jsx("div",{style:{width:"150px"},children:"Aligned end"})})]})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Content Types"}),e.jsxs("div",{style:{display:"flex",gap:"1rem"},children:[e.jsx(r,{trigger:e.jsx(n,{variant:"ghost",children:"Menu"}),children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"4px"},children:[e.jsx("div",{children:"Option 1"}),e.jsx("div",{children:"Option 2"}),e.jsx("div",{children:"Option 3"})]})}),e.jsx(r,{trigger:e.jsx(n,{variant:"secondary",children:"Info"}),children:e.jsxs("div",{children:[e.jsx("strong",{children:"Information"}),e.jsx("p",{style:{margin:"8px 0 0",fontSize:"12px"},children:"This is some helpful information."})]})})]})]})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Open Popover</Button>,
    children: <div>Popover content</div>
  }
}`,...s.parameters?.docs?.source},description:{story:"默认 Popover（bottom-center）",...s.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Controlled</Button>,
    children: <div>Controlled popover</div>
  },
  render: function Render() {
    const [open, setOpen] = useState(false);
    return <div style={{
      display: "flex",
      gap: "1rem",
      alignItems: "center"
    }}>
        <Popover open={open} onOpenChange={setOpen} trigger={<Button>Controlled</Button>}>
          <div>
            <p style={{
            marginBottom: "0.5rem"
          }}>Controlled popover content</p>
            <Button size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </Popover>
        <span style={{
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Open: {open ? "true" : "false"}
        </span>
      </div>;
  }
}`,...d.parameters?.docs?.source},description:{story:"受控模式",...d.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Already Open</Button>,
    children: <div>This popover is open by default</div>,
    defaultOpen: true
  }
}`,...a.parameters?.docs?.source},description:{story:"默认打开（非受控）",...a.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Top</Button>,
    children: <div>Popover on top</div>,
    side: "top"
  }
}`,...l.parameters?.docs?.source},description:{story:"顶部弹出",...l.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Right</Button>,
    children: <div>Popover on right</div>,
    side: "right"
  }
}`,...p.parameters?.docs?.source},description:{story:"右侧弹出",...p.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Bottom</Button>,
    children: <div>Popover on bottom</div>,
    side: "bottom"
  }
}`,...c.parameters?.docs?.source},description:{story:"底部弹出（默认）",...c.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Left</Button>,
    children: <div>Popover on left</div>,
    side: "left"
  }
}`,...g.parameters?.docs?.source},description:{story:"左侧弹出",...g.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Trigger</Button>,
    children: <div>Content</div>
  },
  parameters: {
    layout: "padded"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    padding: "4rem"
  }}>
      <Popover trigger={<Button>Top</Button>} side="top">
        <div>Top popover</div>
      </Popover>
      <div style={{
      display: "flex",
      gap: "4rem"
    }}>
        <Popover trigger={<Button>Left</Button>} side="left">
          <div>Left popover</div>
        </Popover>
        <Popover trigger={<Button>Right</Button>} side="right">
          <div>Right popover</div>
        </Popover>
      </div>
      <Popover trigger={<Button>Bottom</Button>} side="bottom">
        <div>Bottom popover</div>
      </Popover>
    </div>
}`,...v.parameters?.docs?.source},description:{story:"所有方向展示",...v.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Trigger</Button>,
    children: <div>Content</div>
  },
  render: () => <div style={{
    display: "flex",
    gap: "2rem",
    padding: "2rem"
  }}>
      <Popover trigger={<Button>Start</Button>} align="start">
        <div style={{
        width: "150px"
      }}>Aligned to start</div>
      </Popover>
      <Popover trigger={<Button>Center</Button>} align="center">
        <div style={{
        width: "150px"
      }}>Aligned to center</div>
      </Popover>
      <Popover trigger={<Button>End</Button>} align="end">
        <div style={{
        width: "150px"
      }}>Aligned to end</div>
      </Popover>
    </div>
}`,...h.parameters?.docs?.source},description:{story:"对齐变体展示",...h.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button variant="ghost">Options</Button>,
    children: <div>Menu items</div>
  },
  render: () => <Popover trigger={<Button variant="ghost">Options</Button>}>
      <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      margin: "-8px"
    }}>
        {["Edit", "Duplicate", "Archive", "Delete"].map(item => <PopoverClose key={item} asChild>
            <button style={{
          display: "block",
          width: "100%",
          padding: "8px 12px",
          textAlign: "left",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "13px",
          color: item === "Delete" ? "var(--color-error)" : "var(--color-fg-default)"
        }} onMouseOver={e => {
          e.currentTarget.style.background = "var(--color-bg-hover)";
        }} onMouseOut={e => {
          e.currentTarget.style.background = "transparent";
        }}>
              {item}
            </button>
          </PopoverClose>)}
      </div>
    </Popover>
}`,...m.parameters?.docs?.source},description:{story:"菜单样式内容",...m.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button variant="ghost">Info</Button>,
    children: <div>Info content</div>
  },
  render: () => <Popover trigger={<Button variant="ghost">User Info</Button>} side="right">
      <div style={{
      width: "200px"
    }}>
        <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "12px"
      }}>
          <div style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "var(--color-accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: "600"
        }}>
            JD
          </div>
          <div>
            <div style={{
            fontWeight: "500",
            fontSize: "14px"
          }}>John Doe</div>
            <div style={{
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              john@example.com
            </div>
          </div>
        </div>
        <div style={{
        borderTop: "1px solid var(--color-separator)",
        paddingTop: "12px",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Last active 2 hours ago
        </div>
      </div>
    </Popover>
}`,...x.parameters?.docs?.source},description:{story:"信息卡片内容",...x.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Add Tag</Button>,
    children: <div>Form</div>
  },
  render: function Render() {
    const [open, setOpen] = useState(false);
    return <Popover open={open} onOpenChange={setOpen} trigger={<Button>Add Tag</Button>}>
        <div style={{
        width: "200px"
      }}>
          <div style={{
          marginBottom: "8px",
          fontSize: "13px",
          fontWeight: "500"
        }}>
            New Tag
          </div>
          <input type="text" placeholder="Enter tag name..." style={{
          width: "100%",
          padding: "8px 12px",
          border: "1px solid var(--color-border-default)",
          borderRadius: "var(--radius-sm)",
          fontSize: "13px",
          marginBottom: "12px"
        }} />
          <div style={{
          display: "flex",
          gap: "8px",
          justifyContent: "flex-end"
        }}>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={() => setOpen(false)}>
              Add
            </Button>
          </div>
        </div>
      </Popover>;
  }
}`,...u.parameters?.docs?.source},description:{story:"表单内容",...u.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Large Offset</Button>,
    children: <div>20px offset from trigger</div>,
    sideOffset: 20
  }
}`,...f.parameters?.docs?.source},description:{story:"自定义偏移",...f.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Minimal</Button>,
    children: <span>Hi</span>
  }
}`,...y.parameters?.docs?.source},description:{story:"最小内容",...y.parameters?.docs?.description}}};j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Wide</Button>,
    children: <div style={{
      width: "300px"
    }}>
        This is a wider popover that contains more content and might need more
        space to display properly.
      </div>
  }
}`,...j.parameters?.docs?.source},description:{story:"宽内容",...j.parameters?.docs?.description}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  args: {
    trigger: <Button>Trigger</Button>,
    children: <div>Content</div>
  },
  parameters: {
    layout: "fullscreen"
  },
  render: () => <div style={{
    padding: "4rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem"
  }}>
      {/* Sides */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Side Variants
        </h3>
        <div style={{
        display: "flex",
        gap: "1rem"
      }}>
          <Popover trigger={<Button>Top</Button>} side="top">
            <div>Top popover</div>
          </Popover>
          <Popover trigger={<Button>Right</Button>} side="right">
            <div>Right popover</div>
          </Popover>
          <Popover trigger={<Button>Bottom</Button>} side="bottom">
            <div>Bottom popover</div>
          </Popover>
          <Popover trigger={<Button>Left</Button>} side="left">
            <div>Left popover</div>
          </Popover>
        </div>
      </section>

      {/* Aligns */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Align Variants
        </h3>
        <div style={{
        display: "flex",
        gap: "1rem"
      }}>
          <Popover trigger={<Button>Start</Button>} align="start">
            <div style={{
            width: "150px"
          }}>Aligned start</div>
          </Popover>
          <Popover trigger={<Button>Center</Button>} align="center">
            <div style={{
            width: "150px"
          }}>Aligned center</div>
          </Popover>
          <Popover trigger={<Button>End</Button>} align="end">
            <div style={{
            width: "150px"
          }}>Aligned end</div>
          </Popover>
        </div>
      </section>

      {/* Content Types */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Content Types
        </h3>
        <div style={{
        display: "flex",
        gap: "1rem"
      }}>
          <Popover trigger={<Button variant="ghost">Menu</Button>}>
            <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}>
              <div>Option 1</div>
              <div>Option 2</div>
              <div>Option 3</div>
            </div>
          </Popover>
          <Popover trigger={<Button variant="secondary">Info</Button>}>
            <div>
              <strong>Information</strong>
              <p style={{
              margin: "8px 0 0",
              fontSize: "12px"
            }}>
                This is some helpful information.
              </p>
            </div>
          </Popover>
        </div>
      </section>
    </div>
}`,...B.parameters?.docs?.source},description:{story:"完整功能展示（用于 AI 自检）",...B.parameters?.docs?.description}}};const J=["Default","Controlled","DefaultOpen","SideTop","SideRight","SideBottom","SideLeft","AllSides","AllAligns","MenuContent","InfoCard","FormContent","CustomOffset","MinimalContent","WideContent","FullFeatures"];export{h as AllAligns,v as AllSides,d as Controlled,f as CustomOffset,s as Default,a as DefaultOpen,u as FormContent,B as FullFeatures,x as InfoCard,m as MenuContent,y as MinimalContent,c as SideBottom,g as SideLeft,p as SideRight,l as SideTop,j as WideContent,J as __namedExportsOrder,F as default};
