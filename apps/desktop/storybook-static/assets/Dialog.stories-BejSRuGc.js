import{j as e}from"./jsx-runtime-BLchON5X.js";import{r as l}from"./index-DDi9LDaq.js";import{D as r}from"./Dialog-DJV5UiAm.js";import{B as o}from"./Button-B9XLIlTV.js";import"./index-kA4PVysc.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-Dx0N0K8E.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-c9SlT_P8.js";import"./index-nu25GvvV.js";const F={title:"Primitives/Dialog",component:r,parameters:{layout:"centered",docs:{description:{component:`Dialog 组件 Story

设计规范 §11.5
模态对话框组件，基于 Radix UI Dialog 原语构建。
z-index: modal (400)，shadow: xl。

状态矩阵（MUST 全部实现）：
- open: 显示对话框
- closed: 隐藏对话框
- with description: 显示标题下方的描述
- with footer: 显示底部操作按钮
- closeOnEscape: 按 Escape 关闭
- closeOnOverlayClick: 点击遮罩关闭`}}},tags:["autodocs"],argTypes:{open:{control:"boolean",description:"Controlled open state"},title:{control:"text",description:"Dialog title (required for accessibility)"},description:{control:"text",description:"Optional description below title"},closeOnEscape:{control:"boolean",description:"Close on Escape key press"},closeOnOverlayClick:{control:"boolean",description:"Close on overlay click"}}},s={args:{open:!1,title:"Dialog Title",children:"Dialog content goes here.",onOpenChange:()=>{}},render:function(){const[t,n]=l.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(o,{onClick:()=>n(!0),children:"Open Dialog"}),e.jsx(r,{open:t,onOpenChange:n,title:"Dialog Title",children:e.jsx("p",{children:"Dialog content goes here."})})]})}},c={args:{open:!1,title:"Confirm Action",description:"This action cannot be undone.",children:"Are you sure you want to proceed?",onOpenChange:()=>{}},render:function(){const[t,n]=l.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(o,{onClick:()=>n(!0),children:"Open Dialog"}),e.jsx(r,{open:t,onOpenChange:n,title:"Confirm Action",description:"This action cannot be undone.",children:e.jsx("p",{children:"Are you sure you want to proceed?"})})]})}},p={args:{open:!1,title:"Delete Item",description:"This will permanently delete the item.",children:"Are you sure?",onOpenChange:()=>{}},render:function(){const[t,n]=l.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(o,{onClick:()=>n(!0),children:"Open Dialog"}),e.jsx(r,{open:t,onOpenChange:n,title:"Delete Item",description:"This will permanently delete the item.",footer:e.jsxs(e.Fragment,{children:[e.jsx(o,{variant:"ghost",onClick:()=>n(!1),children:"Cancel"}),e.jsx(o,{variant:"danger",onClick:()=>n(!1),children:"Delete"})]}),children:e.jsx("p",{children:"Are you sure you want to delete this item?"})})]})}},d={args:{open:!1,title:"Important Dialog",children:"Press Escape - dialog will NOT close.",closeOnEscape:!1,onOpenChange:()=>{}},render:function(){const[t,n]=l.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(o,{onClick:()=>n(!0),children:"Open Dialog"}),e.jsx(r,{open:t,onOpenChange:n,title:"Important Dialog",closeOnEscape:!1,footer:e.jsx(o,{variant:"primary",onClick:()=>n(!1),children:"Confirm"}),children:e.jsx("p",{children:"Press Escape - dialog will NOT close. You must click Confirm."})})]})}},u={args:{open:!1,title:"Modal Dialog",children:"Click outside - dialog will NOT close.",closeOnOverlayClick:!1,onOpenChange:()=>{}},render:function(){const[t,n]=l.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(o,{onClick:()=>n(!0),children:"Open Dialog"}),e.jsx(r,{open:t,onOpenChange:n,title:"Modal Dialog",closeOnOverlayClick:!1,footer:e.jsx(o,{variant:"primary",onClick:()=>n(!1),children:"Close"}),children:e.jsx("p",{children:"Click outside - dialog will NOT close. Use the close button."})})]})}},g={args:{open:!1,title:"Long Content Dialog",children:"Long content...",onOpenChange:()=>{}},render:function(){const[t,n]=l.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(o,{onClick:()=>n(!0),children:"Open Dialog"}),e.jsx(r,{open:t,onOpenChange:n,title:"Long Content Dialog",footer:e.jsx(o,{variant:"primary",onClick:()=>n(!1),children:"Close"}),children:e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:Array.from({length:20},(i,f)=>e.jsxs("p",{children:["This is paragraph ",f+1,". Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."]},f))})})]})}},m={args:{open:!1,title:"Create Project",children:"Form content...",onOpenChange:()=>{}},render:function(){const[t,n]=l.useState(!1);return e.jsxs(e.Fragment,{children:[e.jsx(o,{onClick:()=>n(!0),children:"Create Project"}),e.jsx(r,{open:t,onOpenChange:n,title:"Create Project",description:"Enter details for your new project.",footer:e.jsxs(e.Fragment,{children:[e.jsx(o,{variant:"ghost",onClick:()=>n(!1),children:"Cancel"}),e.jsx(o,{variant:"primary",onClick:()=>n(!1),children:"Create"})]}),children:e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:[e.jsxs("div",{children:[e.jsx("label",{htmlFor:"project-name",style:{display:"block",marginBottom:"0.5rem",fontSize:"13px",color:"var(--color-fg-default)"},children:"Project Name"}),e.jsx("input",{id:"project-name",type:"text",placeholder:"My Project",style:{width:"100%",padding:"8px 12px",border:"1px solid var(--color-border-default)",borderRadius:"var(--radius-sm)",fontSize:"13px",background:"var(--color-bg-default)",color:"var(--color-fg-default)"}})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"project-desc",style:{display:"block",marginBottom:"0.5rem",fontSize:"13px",color:"var(--color-fg-default)"},children:"Description"}),e.jsx("textarea",{id:"project-desc",placeholder:"Enter description...",rows:3,style:{width:"100%",padding:"8px 12px",border:"1px solid var(--color-border-default)",borderRadius:"var(--radius-sm)",fontSize:"13px",background:"var(--color-bg-default)",color:"var(--color-fg-default)",resize:"vertical"}})]})]})})]})}},h={args:{open:!1,title:"Full Features",children:"Demo",onOpenChange:()=>{}},parameters:{layout:"padded"},render:function(){const[t,n]=l.useState(null);return e.jsxs("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:[e.jsx(o,{onClick:()=>n("basic"),children:"Basic"}),e.jsx(o,{onClick:()=>n("confirm"),children:"Confirm"}),e.jsx(o,{onClick:()=>n("form"),children:"Form"}),e.jsx(o,{variant:"danger",onClick:()=>n("delete"),children:"Delete"}),e.jsx(r,{open:t==="basic",onOpenChange:i=>!i&&n(null),title:"Basic Dialog",children:e.jsx("p",{children:"This is a basic dialog with just content."})}),e.jsx(r,{open:t==="confirm",onOpenChange:i=>!i&&n(null),title:"Confirm Action",description:"Please confirm your action.",footer:e.jsxs(e.Fragment,{children:[e.jsx(o,{variant:"ghost",onClick:()=>n(null),children:"Cancel"}),e.jsx(o,{variant:"primary",onClick:()=>n(null),children:"Confirm"})]}),children:e.jsx("p",{children:"Are you sure you want to continue?"})}),e.jsx(r,{open:t==="form",onOpenChange:i=>!i&&n(null),title:"Edit Settings",footer:e.jsxs(e.Fragment,{children:[e.jsx(o,{variant:"ghost",onClick:()=>n(null),children:"Cancel"}),e.jsx(o,{variant:"primary",onClick:()=>n(null),children:"Save"})]}),children:e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:e.jsx("input",{type:"text",placeholder:"Enter value...",style:{padding:"8px 12px",border:"1px solid var(--color-border-default)",borderRadius:"var(--radius-sm)",fontSize:"13px"}})})}),e.jsx(r,{open:t==="delete",onOpenChange:i=>!i&&n(null),title:"Delete Item",description:"This action cannot be undone.",footer:e.jsxs(e.Fragment,{children:[e.jsx(o,{variant:"ghost",onClick:()=>n(null),children:"Cancel"}),e.jsx(o,{variant:"danger",onClick:()=>n(null),children:"Delete"})]}),children:e.jsx("p",{children:"Are you sure you want to delete this item permanently?"})})]})}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    open: false,
    title: "Dialog Title",
    children: "Dialog content goes here.",
    onOpenChange: () => {}
  },
  render: function Render() {
    const [open, setOpen] = useState(false);
    return <>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Dialog Title">
          <p>Dialog content goes here.</p>
        </Dialog>
      </>;
  }
}`,...s.parameters?.docs?.source},description:{story:`基础对话框（需要交互触发）

使用 render 函数来管理 open 状态`,...s.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    open: false,
    title: "Confirm Action",
    description: "This action cannot be undone.",
    children: "Are you sure you want to proceed?",
    onOpenChange: () => {}
  },
  render: function Render() {
    const [open, setOpen] = useState(false);
    return <>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Confirm Action" description="This action cannot be undone.">
          <p>Are you sure you want to proceed?</p>
        </Dialog>
      </>;
  }
}`,...c.parameters?.docs?.source},description:{story:"带描述的对话框",...c.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    open: false,
    title: "Delete Item",
    description: "This will permanently delete the item.",
    children: "Are you sure?",
    onOpenChange: () => {}
  },
  render: function Render() {
    const [open, setOpen] = useState(false);
    return <>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Delete Item" description="This will permanently delete the item." footer={<>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setOpen(false)}>
                Delete
              </Button>
            </>}>
          <p>Are you sure you want to delete this item?</p>
        </Dialog>
      </>;
  }
}`,...p.parameters?.docs?.source},description:{story:"带 Footer 的对话框",...p.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    open: false,
    title: "Important Dialog",
    children: "Press Escape - dialog will NOT close.",
    closeOnEscape: false,
    onOpenChange: () => {}
  },
  render: function Render() {
    const [open, setOpen] = useState(false);
    return <>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Important Dialog" closeOnEscape={false} footer={<Button variant="primary" onClick={() => setOpen(false)}>
              Confirm
            </Button>}>
          <p>Press Escape - dialog will NOT close. You must click Confirm.</p>
        </Dialog>
      </>;
  }
}`,...d.parameters?.docs?.source},description:{story:"禁止 Escape 关闭",...d.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    open: false,
    title: "Modal Dialog",
    children: "Click outside - dialog will NOT close.",
    closeOnOverlayClick: false,
    onOpenChange: () => {}
  },
  render: function Render() {
    const [open, setOpen] = useState(false);
    return <>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Modal Dialog" closeOnOverlayClick={false} footer={<Button variant="primary" onClick={() => setOpen(false)}>
              Close
            </Button>}>
          <p>Click outside - dialog will NOT close. Use the close button.</p>
        </Dialog>
      </>;
  }
}`,...u.parameters?.docs?.source},description:{story:"禁止点击遮罩关闭",...u.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    open: false,
    title: "Long Content Dialog",
    children: "Long content...",
    onOpenChange: () => {}
  },
  render: function Render() {
    const [open, setOpen] = useState(false);
    return <>
        <Button onClick={() => setOpen(true)}>Open Dialog</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Long Content Dialog" footer={<Button variant="primary" onClick={() => setOpen(false)}>
              Close
            </Button>}>
          <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}>
            {Array.from({
            length: 20
          }, (_, i) => <p key={i}>
                This is paragraph {i + 1}. Lorem ipsum dolor sit amet, consectetur
                adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                dolore magna aliqua.
              </p>)}
          </div>
        </Dialog>
      </>;
  }
}`,...g.parameters?.docs?.source},description:{story:"长内容（可滚动）",...g.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    open: false,
    title: "Create Project",
    children: "Form content...",
    onOpenChange: () => {}
  },
  render: function Render() {
    const [open, setOpen] = useState(false);
    return <>
        <Button onClick={() => setOpen(true)}>Create Project</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Create Project" description="Enter details for your new project." footer={<>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Create
              </Button>
            </>}>
          <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}>
            <div>
              <label htmlFor="project-name" style={{
              display: "block",
              marginBottom: "0.5rem",
              fontSize: "13px",
              color: "var(--color-fg-default)"
            }}>
                Project Name
              </label>
              <input id="project-name" type="text" placeholder="My Project" style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              background: "var(--color-bg-default)",
              color: "var(--color-fg-default)"
            }} />
            </div>
            <div>
              <label htmlFor="project-desc" style={{
              display: "block",
              marginBottom: "0.5rem",
              fontSize: "13px",
              color: "var(--color-fg-default)"
            }}>
                Description
              </label>
              <textarea id="project-desc" placeholder="Enter description..." rows={3} style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              background: "var(--color-bg-default)",
              color: "var(--color-fg-default)",
              resize: "vertical"
            }} />
            </div>
          </div>
        </Dialog>
      </>;
  }
}`,...m.parameters?.docs?.source},description:{story:"表单对话框",...m.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    open: false,
    title: "Full Features",
    children: "Demo",
    onOpenChange: () => {}
  },
  parameters: {
    layout: "padded"
  },
  render: function Render() {
    const [dialogType, setDialogType] = useState<string | null>(null);
    return <div style={{
      display: "flex",
      gap: "1rem",
      flexWrap: "wrap"
    }}>
        <Button onClick={() => setDialogType("basic")}>Basic</Button>
        <Button onClick={() => setDialogType("confirm")}>Confirm</Button>
        <Button onClick={() => setDialogType("form")}>Form</Button>
        <Button variant="danger" onClick={() => setDialogType("delete")}>
          Delete
        </Button>

        {/* Basic */}
        <Dialog open={dialogType === "basic"} onOpenChange={open => !open && setDialogType(null)} title="Basic Dialog">
          <p>This is a basic dialog with just content.</p>
        </Dialog>

        {/* Confirm */}
        <Dialog open={dialogType === "confirm"} onOpenChange={open => !open && setDialogType(null)} title="Confirm Action" description="Please confirm your action." footer={<>
              <Button variant="ghost" onClick={() => setDialogType(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setDialogType(null)}>
                Confirm
              </Button>
            </>}>
          <p>Are you sure you want to continue?</p>
        </Dialog>

        {/* Form */}
        <Dialog open={dialogType === "form"} onOpenChange={open => !open && setDialogType(null)} title="Edit Settings" footer={<>
              <Button variant="ghost" onClick={() => setDialogType(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setDialogType(null)}>
                Save
              </Button>
            </>}>
          <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}>
            <input type="text" placeholder="Enter value..." style={{
            padding: "8px 12px",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px"
          }} />
          </div>
        </Dialog>

        {/* Delete */}
        <Dialog open={dialogType === "delete"} onOpenChange={open => !open && setDialogType(null)} title="Delete Item" description="This action cannot be undone." footer={<>
              <Button variant="ghost" onClick={() => setDialogType(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setDialogType(null)}>
                Delete
              </Button>
            </>}>
          <p>Are you sure you want to delete this item permanently?</p>
        </Dialog>
      </div>;
  }
}`,...h.parameters?.docs?.source},description:{story:"完整功能展示（用于 AI 自检）",...h.parameters?.docs?.description}}};const E=["Default","WithDescription","WithFooter","NoEscapeClose","NoOverlayClose","LongContent","FormDialog","FullFeatures"];export{s as Default,m as FormDialog,h as FullFeatures,g as LongContent,d as NoEscapeClose,u as NoOverlayClose,c as WithDescription,p as WithFooter,E as __namedExportsOrder,F as default};
