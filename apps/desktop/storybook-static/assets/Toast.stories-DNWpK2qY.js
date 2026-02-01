import{j as e}from"./jsx-runtime-BLchON5X.js";import{R as S}from"./index-DDi9LDaq.js";import{T,a as x,b as w,u as v}from"./Toast-HPSiDIc2.js";import{B as h}from"./Button-B9XLIlTV.js";import"./index-kA4PVysc.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-DkX_XZs0.js";import"./index-D6SgtPiA.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-nu25GvvV.js";import"./index-BEZKqDeb.js";const H={title:"Primitives/Toast",component:T,parameters:{layout:"fullscreen",docs:{description:{component:`Toast 组件 Story

用于显示临时通知消息。
基于 Radix UI Toast。`}}},tags:["autodocs"],decorators:[r=>e.jsx(x,{children:e.jsxs("div",{style:{padding:"2rem",minHeight:"300px"},children:[e.jsx(r,{}),e.jsx(w,{})]})})],argTypes:{variant:{control:"select",options:["default","success","error","warning"],description:"Visual variant"},duration:{control:"number",description:"Duration in ms before auto-close"}}},o={args:{title:"Notification",description:"This is a toast notification.",open:!0}},n={args:{title:"Success!",description:"Your changes have been saved successfully.",variant:"success",open:!0}},a={args:{title:"Error",description:"Something went wrong. Please try again.",variant:"error",open:!0}},i={args:{title:"Warning",description:"This action cannot be undone.",variant:"warning",open:!0}},c={args:{title:"File uploaded",open:!0}},p={args:{title:"File deleted",description:"The file has been moved to trash.",action:{label:"Undo",onClick:()=>console.log("Undo clicked")},open:!0}},f=["default","success","error","warning"];function j(){const[r,t]=S.useState({default:!0,success:!0,error:!0,warning:!0});return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:[e.jsx("div",{style:{display:"flex",gap:"0.5rem"},children:f.map(s=>e.jsxs(h,{size:"sm",onClick:()=>t(g=>({...g,[s]:!0})),children:["Show ",s]},s))}),f.map(s=>e.jsx(T,{title:`${s.charAt(0).toUpperCase()+s.slice(1)} Toast`,description:`This is a ${s} toast message.`,variant:s,open:r[s],onOpenChange:g=>t(y=>({...y,[s]:g}))},s))]})}const d={args:{title:"Toast",open:!0},render:()=>e.jsx(j,{})};function k(){const{toast:r,showToast:t,setOpen:s}=v();return e.jsxs("div",{style:{display:"flex",gap:"0.5rem"},children:[e.jsx(h,{variant:"primary",onClick:()=>t({title:"Success!",description:"Action completed successfully.",variant:"success"}),children:"Show Success"}),e.jsx(h,{variant:"danger",onClick:()=>t({title:"Error",description:"Something went wrong.",variant:"error"}),children:"Show Error"}),e.jsx(T,{...r,onOpenChange:s})]})}const m={args:{title:"Toast",open:!1},render:()=>e.jsx(k,{})},l={args:{title:"Persistent Toast",description:"This toast won't auto-close. Click the X to dismiss.",duration:0,open:!0}},u={args:{title:"Quick Toast",description:"This will disappear in 2 seconds.",duration:2e3,open:!0}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Notification",
    description: "This is a toast notification.",
    open: true
  }
}`,...o.parameters?.docs?.source},description:{story:"默认状态",...o.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Success!",
    description: "Your changes have been saved successfully.",
    variant: "success",
    open: true
  }
}`,...n.parameters?.docs?.source},description:{story:"成功状态",...n.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Error",
    description: "Something went wrong. Please try again.",
    variant: "error",
    open: true
  }
}`,...a.parameters?.docs?.source},description:{story:"错误状态",...a.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Warning",
    description: "This action cannot be undone.",
    variant: "warning",
    open: true
  }
}`,...i.parameters?.docs?.source},description:{story:"警告状态",...i.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    title: "File uploaded",
    open: true
  }
}`,...c.parameters?.docs?.source},description:{story:"只有标题",...c.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    title: "File deleted",
    description: "The file has been moved to trash.",
    action: {
      label: "Undo",
      onClick: () => console.log("Undo clicked")
    },
    open: true
  }
}`,...p.parameters?.docs?.source},description:{story:"带操作按钮",...p.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Toast",
    open: true
  },
  render: () => <AllVariantsDemo />
}`,...d.parameters?.docs?.source},description:{story:"所有 Variants 展示",...d.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Toast",
    open: false
  },
  render: () => <ToastDemo />
}`,...m.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Persistent Toast",
    description: "This toast won't auto-close. Click the X to dismiss.",
    duration: 0,
    open: true
  }
}`,...l.parameters?.docs?.source},description:{story:"不自动关闭",...l.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Quick Toast",
    description: "This will disappear in 2 seconds.",
    duration: 2000,
    open: true
  }
}`,...u.parameters?.docs?.source},description:{story:"快速自动关闭",...u.parameters?.docs?.description}}};const B=["Default","Success","Error","Warning","TitleOnly","WithAction","AllVariants","WithHook","Persistent","QuickDismiss"];export{d as AllVariants,o as Default,a as Error,l as Persistent,u as QuickDismiss,n as Success,c as TitleOnly,i as Warning,p as WithAction,m as WithHook,B as __namedExportsOrder,H as default};
