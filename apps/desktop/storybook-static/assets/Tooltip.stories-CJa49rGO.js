import{j as t}from"./jsx-runtime-BLchON5X.js";import{T as e}from"./Tooltip-Ca9CUhYJ.js";import{B as o}from"./Button-B9XLIlTV.js";import"./index-kA4PVysc.js";import"./index-DDi9LDaq.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-Dx0N0K8E.js";import"./index-wwK3GREC.js";import"./index-CEv_TvBl.js";import"./index-nu25GvvV.js";import"./index-BEZKqDeb.js";const I={title:"Primitives/Tooltip",component:e,parameters:{layout:"centered",docs:{description:{component:`Tooltip 组件 Story

用于在悬停时显示额外信息。
基于 Radix UI Tooltip。`}}},tags:["autodocs"],argTypes:{side:{control:"select",options:["top","right","bottom","left"],description:"Side where tooltip appears"},align:{control:"select",options:["start","center","end"],description:"Alignment of tooltip"},delayDuration:{control:"number",description:"Delay in ms before showing tooltip"}}},n={args:{content:"This is a tooltip",children:t.jsx(o,{children:"Hover me"})}},r={args:{content:"This is a longer tooltip that contains more information about the element you're hovering over.",children:t.jsx(o,{children:"Hover for details"})}},i={args:{content:"Top tooltip",side:"top",children:t.jsx(o,{children:"Top"})}},s={args:{content:"Right tooltip",side:"right",children:t.jsx(o,{children:"Right"})}},a={args:{content:"Bottom tooltip",side:"bottom",children:t.jsx(o,{children:"Bottom"})}},c={args:{content:"Left tooltip",side:"left",children:t.jsx(o,{children:"Left"})}},d={args:{content:"Tooltip",children:t.jsx(o,{children:"Hover"})},render:()=>t.jsxs("div",{style:{display:"flex",gap:"2rem",padding:"4rem"},children:[t.jsx(e,{content:"Top tooltip",side:"top",children:t.jsx(o,{children:"Top"})}),t.jsx(e,{content:"Right tooltip",side:"right",children:t.jsx(o,{children:"Right"})}),t.jsx(e,{content:"Bottom tooltip",side:"bottom",children:t.jsx(o,{children:"Bottom"})}),t.jsx(e,{content:"Left tooltip",side:"left",children:t.jsx(o,{children:"Left"})})]})},l={args:{content:"Tooltip",children:t.jsx(o,{children:"Hover"})},render:()=>t.jsxs("div",{style:{display:"flex",gap:"1.5rem",alignItems:"center"},children:[t.jsx(e,{content:"Button tooltip",children:t.jsx(o,{variant:"primary",children:"Button"})}),t.jsx(e,{content:"Text tooltip",children:t.jsx("span",{style:{cursor:"help",textDecoration:"underline dotted",color:"var(--color-fg-default)"},children:"Hover text"})}),t.jsx(e,{content:"Icon tooltip",children:t.jsx("button",{type:"button",style:{width:"32px",height:"32px",borderRadius:"var(--radius-full)",border:"1px solid var(--color-border-default)",background:"transparent",color:"var(--color-fg-muted)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},children:"?"})})]})},p={args:{content:"Instant tooltip",delayDuration:0,children:t.jsx(o,{children:"No delay"})}},m={args:{content:"Delayed tooltip",delayDuration:1e3,children:t.jsx(o,{children:"1s delay"})}},u={args:{content:"Tooltip",children:t.jsx(o,{children:"Hover"})},render:()=>t.jsxs("div",{style:{display:"flex",gap:"2rem",padding:"4rem"},children:[t.jsx(e,{content:"Start aligned",side:"bottom",align:"start",children:t.jsx(o,{style:{width:"120px"},children:"Start"})}),t.jsx(e,{content:"Center aligned",side:"bottom",align:"center",children:t.jsx(o,{style:{width:"120px"},children:"Center"})}),t.jsx(e,{content:"End aligned",side:"bottom",align:"end",children:t.jsx(o,{style:{width:"120px"},children:"End"})})]})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    content: "This is a tooltip",
    children: <Button>Hover me</Button>
  }
}`,...n.parameters?.docs?.source},description:{story:"默认状态",...n.parameters?.docs?.description}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    content: "This is a longer tooltip that contains more information about the element you're hovering over.",
    children: <Button>Hover for details</Button>
  }
}`,...r.parameters?.docs?.source},description:{story:"长文本内容",...r.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    content: "Top tooltip",
    side: "top",
    children: <Button>Top</Button>
  }
}`,...i.parameters?.docs?.source},description:{story:"Top side",...i.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    content: "Right tooltip",
    side: "right",
    children: <Button>Right</Button>
  }
}`,...s.parameters?.docs?.source},description:{story:"Right side",...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    content: "Bottom tooltip",
    side: "bottom",
    children: <Button>Bottom</Button>
  }
}`,...a.parameters?.docs?.source},description:{story:"Bottom side",...a.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    content: "Left tooltip",
    side: "left",
    children: <Button>Left</Button>
  }
}`,...c.parameters?.docs?.source},description:{story:"Left side",...c.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    content: "Tooltip",
    children: <Button>Hover</Button>
  },
  render: () => <div style={{
    display: "flex",
    gap: "2rem",
    padding: "4rem"
  }}>
      <Tooltip content="Top tooltip" side="top">
        <Button>Top</Button>
      </Tooltip>
      <Tooltip content="Right tooltip" side="right">
        <Button>Right</Button>
      </Tooltip>
      <Tooltip content="Bottom tooltip" side="bottom">
        <Button>Bottom</Button>
      </Tooltip>
      <Tooltip content="Left tooltip" side="left">
        <Button>Left</Button>
      </Tooltip>
    </div>
}`,...d.parameters?.docs?.source},description:{story:"所有方向展示",...d.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    content: "Tooltip",
    children: <Button>Hover</Button>
  },
  render: () => <div style={{
    display: "flex",
    gap: "1.5rem",
    alignItems: "center"
  }}>
      <Tooltip content="Button tooltip">
        <Button variant="primary">Button</Button>
      </Tooltip>
      <Tooltip content="Text tooltip">
        <span style={{
        cursor: "help",
        textDecoration: "underline dotted",
        color: "var(--color-fg-default)"
      }}>
          Hover text
        </span>
      </Tooltip>
      <Tooltip content="Icon tooltip">
        <button type="button" style={{
        width: "32px",
        height: "32px",
        borderRadius: "var(--radius-full)",
        border: "1px solid var(--color-border-default)",
        background: "transparent",
        color: "var(--color-fg-muted)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
          ?
        </button>
      </Tooltip>
    </div>
}`,...l.parameters?.docs?.source},description:{story:"不同触发元素",...l.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    content: "Instant tooltip",
    delayDuration: 0,
    children: <Button>No delay</Button>
  }
}`,...p.parameters?.docs?.source},description:{story:"即时显示",...p.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    content: "Delayed tooltip",
    delayDuration: 1000,
    children: <Button>1s delay</Button>
  }
}`,...m.parameters?.docs?.source},description:{story:"长延迟",...m.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    content: "Tooltip",
    children: <Button>Hover</Button>
  },
  render: () => <div style={{
    display: "flex",
    gap: "2rem",
    padding: "4rem"
  }}>
      <Tooltip content="Start aligned" side="bottom" align="start">
        <Button style={{
        width: "120px"
      }}>Start</Button>
      </Tooltip>
      <Tooltip content="Center aligned" side="bottom" align="center">
        <Button style={{
        width: "120px"
      }}>Center</Button>
      </Tooltip>
      <Tooltip content="End aligned" side="bottom" align="end">
        <Button style={{
        width: "120px"
      }}>End</Button>
      </Tooltip>
    </div>
}`,...u.parameters?.docs?.source},description:{story:"对齐方式",...u.parameters?.docs?.description}}};const w=["Default","LongContent","Top","Right","Bottom","Left","AllSides","DifferentTriggers","InstantDelay","LongDelay","Alignments"];export{u as Alignments,d as AllSides,a as Bottom,n as Default,l as DifferentTriggers,p as InstantDelay,c as Left,r as LongContent,m as LongDelay,s as Right,i as Top,w as __namedExportsOrder,I as default};
