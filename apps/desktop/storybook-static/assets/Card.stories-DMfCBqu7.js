import{j as n}from"./jsx-runtime-BLchON5X.js";import{C as e}from"./Card-D2dqmnxE.js";import"./index-kA4PVysc.js";const W={title:"Primitives/Card",component:e,parameters:{layout:"centered",docs:{description:{component:`Card 组件 Story

设计规范 §6.3
容器组件，用于内容分组和视觉分隔。

Variant 矩阵：
- default: 标准边框（无阴影）
- raised: 带阴影的悬浮样式
- bordered: 加粗边框

状态矩阵（MUST 全部实现）：
- default: 正常样式
- hover (hoverable): 边框高亮 + 可选阴影`}}},tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","raised","bordered"],description:"Visual style variant"},hoverable:{control:"boolean",description:"Enable hover effect (border highlight, optional shadow)"},noPadding:{control:"boolean",description:"Remove padding for custom layouts"}}},t={args:{children:n.jsxs("div",{children:[n.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px",fontWeight:600},children:"Card Title"}),n.jsx("p",{style:{margin:0,fontSize:"14px",color:"var(--color-fg-muted)"},children:"This is the card content. Cards are containers for grouping related content."})]})}},o={args:{variant:"raised",children:n.jsxs("div",{children:[n.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px",fontWeight:600},children:"Raised Card"}),n.jsx("p",{style:{margin:0,fontSize:"14px",color:"var(--color-fg-muted)"},children:"This card has elevation shadow for floating elements."})]})}},a={args:{variant:"bordered",children:n.jsxs("div",{children:[n.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px",fontWeight:600},children:"Bordered Card"}),n.jsx("p",{style:{margin:0,fontSize:"14px",color:"var(--color-fg-muted)"},children:"This card has a prominent border."})]})}},i={args:{hoverable:!0,children:n.jsxs("div",{children:[n.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px",fontWeight:600},children:"Hoverable Card"}),n.jsx("p",{style:{margin:0,fontSize:"14px",color:"var(--color-fg-muted)"},children:"Hover over this card to see the effect."})]})}},s={args:{variant:"raised",hoverable:!0,children:n.jsxs("div",{children:[n.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px",fontWeight:600},children:"Hoverable Raised Card"}),n.jsx("p",{style:{margin:0,fontSize:"14px",color:"var(--color-fg-muted)"},children:"Combined raised variant with hover effect."})]})}},d={args:{noPadding:!0,children:n.jsxs("div",{style:{padding:"1rem",background:"var(--color-bg-muted)"},children:[n.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px",fontWeight:600},children:"Custom Padding Card"}),n.jsx("p",{style:{margin:0,fontSize:"14px",color:"var(--color-fg-muted)"},children:"This card has no padding - useful for custom layouts."})]})}},l={args:{children:"Card"},render:()=>n.jsxs("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:[n.jsx(e,{children:n.jsxs("div",{style:{minWidth:"150px"},children:[n.jsx("strong",{children:"Default"}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"14px",color:"var(--color-fg-muted)"},children:"Standard card"})]})}),n.jsx(e,{variant:"raised",children:n.jsxs("div",{style:{minWidth:"150px"},children:[n.jsx("strong",{children:"Raised"}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"14px",color:"var(--color-fg-muted)"},children:"Elevated card"})]})}),n.jsx(e,{variant:"bordered",children:n.jsxs("div",{style:{minWidth:"150px"},children:[n.jsx("strong",{children:"Bordered"}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"14px",color:"var(--color-fg-muted)"},children:"Prominent border"})]})})]})},c={args:{children:"Card"},render:()=>n.jsxs("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:[n.jsx(e,{hoverable:!0,children:n.jsxs("div",{style:{minWidth:"150px"},children:[n.jsx("strong",{children:"Default Hoverable"}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"14px",color:"var(--color-fg-muted)"},children:"Hover to see effect"})]})}),n.jsx(e,{variant:"raised",hoverable:!0,children:n.jsxs("div",{style:{minWidth:"150px"},children:[n.jsx("strong",{children:"Raised Hoverable"}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"14px",color:"var(--color-fg-muted)"},children:"Hover to see effect"})]})}),n.jsx(e,{variant:"bordered",hoverable:!0,children:n.jsxs("div",{style:{minWidth:"150px"},children:[n.jsx("strong",{children:"Bordered Hoverable"}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"14px",color:"var(--color-fg-muted)"},children:"Hover to see effect"})]})})]})},p={args:{children:"Card"},render:()=>n.jsxs(e,{children:[n.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",paddingBottom:"0.75rem",borderBottom:"1px solid var(--color-border-default)"},children:[n.jsx("h3",{style:{margin:0,fontSize:"16px",fontWeight:600},children:"Card Header"}),n.jsx("button",{style:{background:"none",border:"none",cursor:"pointer",color:"var(--color-fg-muted)"},children:"..."})]}),n.jsx("div",{style:{marginBottom:"1rem"},children:n.jsx("p",{style:{margin:0,fontSize:"14px",color:"var(--color-fg-muted)"},children:"This is the main content area of the card. It can contain any type of content including text, images, forms, or other components."})}),n.jsxs("div",{style:{display:"flex",justifyContent:"flex-end",gap:"0.5rem",paddingTop:"0.75rem",borderTop:"1px solid var(--color-border-default)"},children:[n.jsx("button",{style:{padding:"0.5rem 1rem",background:"transparent",border:"1px solid var(--color-border-default)",borderRadius:"var(--radius-md)",cursor:"pointer"},children:"Cancel"}),n.jsx("button",{style:{padding:"0.5rem 1rem",background:"var(--color-primary)",color:"white",border:"none",borderRadius:"var(--radius-md)",cursor:"pointer"},children:"Save"})]})]})},m={args:{children:n.jsx("div",{style:{height:"50px"}})}},g={args:{children:n.jsxs("div",{children:[n.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px",fontWeight:600},children:"Card with Long Content"}),n.jsx("p",{style:{margin:0,fontSize:"14px",color:"var(--color-fg-muted)"},children:"This is a very long piece of content that demonstrates how the card handles overflow. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."})]})}},h={args:{children:"Card"},parameters:{layout:"padded"},render:()=>n.jsx("div",{style:{width:"300px",border:"1px dashed var(--color-border-default)"},children:n.jsxs(e,{children:[n.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px",fontWeight:600},children:"Very Long Card Title That Should Handle Overflow"}),n.jsx("p",{style:{margin:0,fontSize:"14px",color:"var(--color-fg-muted)"},children:"This content is constrained within a 300px container."})]})})},x={args:{children:"Card"},render:()=>n.jsxs(e,{children:[n.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"16px",fontWeight:600},children:"Parent Card"}),n.jsxs(e,{variant:"bordered",children:[n.jsx("h4",{style:{margin:"0 0 0.5rem",fontSize:"14px",fontWeight:600},children:"Nested Card"}),n.jsx("p",{style:{margin:0,fontSize:"13px",color:"var(--color-fg-muted)"},children:"Cards can be nested for complex layouts."})]})]})},f={args:{children:n.jsxs("div",{children:[n.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px",fontWeight:600},children:"🚀 Launch Card"}),n.jsx("p",{style:{margin:0,fontSize:"14px",color:"var(--color-fg-muted)"},children:"Card with emoji content 🎉"})]})}},S=["default","raised","bordered"],v={args:{children:"Card"},parameters:{layout:"padded"},render:()=>n.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1.5rem"},children:S.map(r=>n.jsxs("div",{children:[n.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)",textTransform:"uppercase",letterSpacing:"0.05em"},children:r}),n.jsxs("div",{style:{display:"flex",gap:"1rem"},children:[n.jsx(e,{variant:r,children:n.jsxs("div",{style:{minWidth:"120px"},children:[n.jsx("strong",{children:"Normal"}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Default state"})]})}),n.jsx(e,{variant:r,hoverable:!0,children:n.jsxs("div",{style:{minWidth:"120px"},children:[n.jsx("strong",{children:"Hoverable"}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Hover me"})]})})]})]},r))})},y={args:{children:"Card"},parameters:{layout:"fullscreen"},render:()=>n.jsxs("div",{style:{padding:"2rem",display:"flex",flexDirection:"column",gap:"2rem"},children:[n.jsxs("section",{children:[n.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Variants"}),n.jsx("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:S.map(r=>n.jsx(e,{variant:r,children:n.jsxs("div",{style:{minWidth:"120px"},children:[n.jsx("strong",{children:r}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Card variant"})]})},r))})]}),n.jsxs("section",{children:[n.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Hoverable States"}),n.jsx("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:S.map(r=>n.jsx(e,{variant:r,hoverable:!0,children:n.jsxs("div",{style:{minWidth:"120px"},children:[n.jsxs("strong",{children:[r," + hoverable"]}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Hover to see effect"})]})},r))})]}),n.jsxs("section",{children:[n.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Padding Options"}),n.jsxs("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:[n.jsx(e,{children:n.jsxs("div",{style:{minWidth:"120px"},children:[n.jsx("strong",{children:"With Padding"}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Default padding (24px)"})]})}),n.jsx(e,{noPadding:!0,children:n.jsxs("div",{style:{padding:"1rem",background:"var(--color-bg-muted)",minWidth:"120px"},children:[n.jsx("strong",{children:"No Padding"}),n.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Custom layout"})]})})]})]}),n.jsxs("section",{children:[n.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Slot Pattern (Header + Content + Footer)"}),n.jsx("div",{style:{maxWidth:"400px"},children:n.jsxs(e,{children:[n.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",paddingBottom:"0.75rem",borderBottom:"1px solid var(--color-border-default)"},children:[n.jsx("h4",{style:{margin:0,fontSize:"14px",fontWeight:600},children:"Header"}),n.jsx("span",{style:{color:"var(--color-fg-muted)"},children:"..."})]}),n.jsx("p",{style:{margin:"0 0 1rem",fontSize:"13px",color:"var(--color-fg-muted)"},children:"Main content area of the card."}),n.jsx("div",{style:{display:"flex",justifyContent:"flex-end",gap:"0.5rem",paddingTop:"0.75rem",borderTop:"1px solid var(--color-border-default)"},children:n.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Footer"})})]})})]}),n.jsxs("section",{children:[n.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Edge Cases"}),n.jsxs("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap",alignItems:"flex-start"},children:[n.jsx(e,{children:n.jsx("div",{style:{minWidth:"100px",height:"30px"},children:n.jsx("strong",{children:"Empty"})})}),n.jsx(e,{children:n.jsx(e,{variant:"bordered",children:n.jsx("strong",{children:"Nested"})})}),n.jsx(e,{children:n.jsx("strong",{children:"🚀 Emoji"})})]})]})]})},u={args:{children:"Card"},render:()=>n.jsxs("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:[n.jsxs(e,{hoverable:!0,style:{width:"250px"},children:[n.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px",fontWeight:600},children:"我的小说项目"}),n.jsx("p",{style:{margin:"0 0 1rem",fontSize:"13px",color:"var(--color-fg-muted)"},children:"科幻小说创作，目前第三章进行中..."}),n.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"var(--color-fg-muted)"},children:[n.jsx("span",{children:"12,345 字"}),n.jsx("span",{children:"2 天前"})]})]}),n.jsxs(e,{hoverable:!0,style:{width:"250px"},children:[n.jsx("h3",{style:{margin:"0 0 0.5rem",fontSize:"16px",fontWeight:600},children:"商业计划书"}),n.jsx("p",{style:{margin:"0 0 1rem",fontSize:"13px",color:"var(--color-fg-muted)"},children:"创业项目商业计划书初稿..."}),n.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"var(--color-fg-muted)"},children:[n.jsx("span",{children:"5,678 字"}),n.jsx("span",{children:"1 周前"})]})]})]})},j={args:{children:"Card"},parameters:{layout:"padded"},render:()=>n.jsxs("div",{style:{maxWidth:"500px",display:"flex",flexDirection:"column",gap:"1rem"},children:[n.jsxs(e,{children:[n.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"16px",fontWeight:600},children:"外观设置"}),n.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.75rem"},children:[n.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[n.jsx("span",{style:{fontSize:"14px"},children:"主题"}),n.jsx("span",{style:{fontSize:"14px",color:"var(--color-fg-muted)"},children:"深色"})]}),n.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[n.jsx("span",{style:{fontSize:"14px"},children:"字体大小"}),n.jsx("span",{style:{fontSize:"14px",color:"var(--color-fg-muted)"},children:"中"})]})]})]}),n.jsxs(e,{children:[n.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"16px",fontWeight:600},children:"AI 设置"}),n.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.75rem"},children:[n.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[n.jsx("span",{style:{fontSize:"14px"},children:"模型"}),n.jsx("span",{style:{fontSize:"14px",color:"var(--color-fg-muted)"},children:"GPT-4"})]}),n.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[n.jsx("span",{style:{fontSize:"14px"},children:"创意度"}),n.jsx("span",{style:{fontSize:"14px",color:"var(--color-fg-muted)"},children:"0.7"})]})]})]})]})};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    children: <div>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "16px",
        fontWeight: 600
      }}>
          Card Title
        </h3>
        <p style={{
        margin: 0,
        fontSize: "14px",
        color: "var(--color-fg-muted)"
      }}>
          This is the card content. Cards are containers for grouping related content.
        </p>
      </div>
  }
}`,...t.parameters?.docs?.source},description:{story:"默认状态：标准卡片",...t.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "raised",
    children: <div>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "16px",
        fontWeight: 600
      }}>
          Raised Card
        </h3>
        <p style={{
        margin: 0,
        fontSize: "14px",
        color: "var(--color-fg-muted)"
      }}>
          This card has elevation shadow for floating elements.
        </p>
      </div>
  }
}`,...o.parameters?.docs?.source},description:{story:"Raised variant：带阴影的悬浮卡片",...o.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "bordered",
    children: <div>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "16px",
        fontWeight: 600
      }}>
          Bordered Card
        </h3>
        <p style={{
        margin: 0,
        fontSize: "14px",
        color: "var(--color-fg-muted)"
      }}>
          This card has a prominent border.
        </p>
      </div>
  }
}`,...a.parameters?.docs?.source},description:{story:"Bordered variant：加粗边框卡片",...a.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    hoverable: true,
    children: <div>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "16px",
        fontWeight: 600
      }}>
          Hoverable Card
        </h3>
        <p style={{
        margin: 0,
        fontSize: "14px",
        color: "var(--color-fg-muted)"
      }}>
          Hover over this card to see the effect.
        </p>
      </div>
  }
}`,...i.parameters?.docs?.source},description:{story:"Hoverable：可点击卡片（有 hover 效果）",...i.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "raised",
    hoverable: true,
    children: <div>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "16px",
        fontWeight: 600
      }}>
          Hoverable Raised Card
        </h3>
        <p style={{
        margin: 0,
        fontSize: "14px",
        color: "var(--color-fg-muted)"
      }}>
          Combined raised variant with hover effect.
        </p>
      </div>
  }
}`,...s.parameters?.docs?.source},description:{story:"Hoverable + Raised：可点击悬浮卡片",...s.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    noPadding: true,
    children: <div style={{
      padding: "1rem",
      background: "var(--color-bg-muted)"
    }}>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "16px",
        fontWeight: 600
      }}>
          Custom Padding Card
        </h3>
        <p style={{
        margin: 0,
        fontSize: "14px",
        color: "var(--color-fg-muted)"
      }}>
          This card has no padding - useful for custom layouts.
        </p>
      </div>
  }
}`,...d.parameters?.docs?.source},description:{story:"No Padding：无内边距",...d.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Card"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap"
  }}>
      <Card>
        <div style={{
        minWidth: "150px"
      }}>
          <strong>Default</strong>
          <p style={{
          margin: "0.5rem 0 0",
          fontSize: "14px",
          color: "var(--color-fg-muted)"
        }}>
            Standard card
          </p>
        </div>
      </Card>
      <Card variant="raised">
        <div style={{
        minWidth: "150px"
      }}>
          <strong>Raised</strong>
          <p style={{
          margin: "0.5rem 0 0",
          fontSize: "14px",
          color: "var(--color-fg-muted)"
        }}>
            Elevated card
          </p>
        </div>
      </Card>
      <Card variant="bordered">
        <div style={{
        minWidth: "150px"
      }}>
          <strong>Bordered</strong>
          <p style={{
          margin: "0.5rem 0 0",
          fontSize: "14px",
          color: "var(--color-fg-muted)"
        }}>
            Prominent border
          </p>
        </div>
      </Card>
    </div>
}`,...l.parameters?.docs?.source},description:{story:"所有 Variants 展示",...l.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Card"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap"
  }}>
      <Card hoverable>
        <div style={{
        minWidth: "150px"
      }}>
          <strong>Default Hoverable</strong>
          <p style={{
          margin: "0.5rem 0 0",
          fontSize: "14px",
          color: "var(--color-fg-muted)"
        }}>
            Hover to see effect
          </p>
        </div>
      </Card>
      <Card variant="raised" hoverable>
        <div style={{
        minWidth: "150px"
      }}>
          <strong>Raised Hoverable</strong>
          <p style={{
          margin: "0.5rem 0 0",
          fontSize: "14px",
          color: "var(--color-fg-muted)"
        }}>
            Hover to see effect
          </p>
        </div>
      </Card>
      <Card variant="bordered" hoverable>
        <div style={{
        minWidth: "150px"
      }}>
          <strong>Bordered Hoverable</strong>
          <p style={{
          margin: "0.5rem 0 0",
          fontSize: "14px",
          color: "var(--color-fg-muted)"
        }}>
            Hover to see effect
          </p>
        </div>
      </Card>
    </div>
}`,...c.parameters?.docs?.source},description:{story:"所有 Hoverable 状态展示",...c.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Card"
  },
  render: () => <Card>
      {/* Header */}
      <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "1rem",
      paddingBottom: "0.75rem",
      borderBottom: "1px solid var(--color-border-default)"
    }}>
        <h3 style={{
        margin: 0,
        fontSize: "16px",
        fontWeight: 600
      }}>Card Header</h3>
        <button style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--color-fg-muted)"
      }}>
          ...
        </button>
      </div>
      {/* Content */}
      <div style={{
      marginBottom: "1rem"
    }}>
        <p style={{
        margin: 0,
        fontSize: "14px",
        color: "var(--color-fg-muted)"
      }}>
          This is the main content area of the card. It can contain any type of content including
          text, images, forms, or other components.
        </p>
      </div>
      {/* Footer */}
      <div style={{
      display: "flex",
      justifyContent: "flex-end",
      gap: "0.5rem",
      paddingTop: "0.75rem",
      borderTop: "1px solid var(--color-border-default)"
    }}>
        <button style={{
        padding: "0.5rem 1rem",
        background: "transparent",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer"
      }}>
          Cancel
        </button>
        <button style={{
        padding: "0.5rem 1rem",
        background: "var(--color-primary)",
        color: "white",
        border: "none",
        borderRadius: "var(--radius-md)",
        cursor: "pointer"
      }}>
          Save
        </button>
      </div>
    </Card>
}`,...p.parameters?.docs?.source},description:{story:"Header + Content + Footer Slot 模式",...p.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    children: <div style={{
      height: "50px"
    }} />
  }
}`,...m.parameters?.docs?.source},description:{story:`空内容

验证空内容时卡片仍保持正常样式`,...m.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    children: <div>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "16px",
        fontWeight: 600
      }}>
          Card with Long Content
        </h3>
        <p style={{
        margin: 0,
        fontSize: "14px",
        color: "var(--color-fg-muted)"
      }}>
          This is a very long piece of content that demonstrates how the card handles overflow.
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
          ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </div>
  }
}`,...g.parameters?.docs?.source},description:{story:`超长内容

验证内容溢出时的处理`,...g.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Card"
  },
  parameters: {
    layout: "padded"
  },
  render: () => <div style={{
    width: "300px",
    border: "1px dashed var(--color-border-default)"
  }}>
      <Card>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "16px",
        fontWeight: 600
      }}>
          Very Long Card Title That Should Handle Overflow
        </h3>
        <p style={{
        margin: 0,
        fontSize: "14px",
        color: "var(--color-fg-muted)"
      }}>
          This content is constrained within a 300px container.
        </p>
      </Card>
    </div>
}`,...h.parameters?.docs?.source},description:{story:`超长内容（在有限宽度容器中）

验证内容过长时不会撑破布局`,...h.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Card"
  },
  render: () => <Card>
      <h3 style={{
      margin: "0 0 1rem",
      fontSize: "16px",
      fontWeight: 600
    }}>Parent Card</h3>
      <Card variant="bordered">
        <h4 style={{
        margin: "0 0 0.5rem",
        fontSize: "14px",
        fontWeight: 600
      }}>Nested Card</h4>
        <p style={{
        margin: 0,
        fontSize: "13px",
        color: "var(--color-fg-muted)"
      }}>
          Cards can be nested for complex layouts.
        </p>
      </Card>
    </Card>
}`,...x.parameters?.docs?.source},description:{story:`嵌套 Card

验证嵌套卡片的样式`,...x.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    children: <div>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "16px",
        fontWeight: 600
      }}>
          🚀 Launch Card
        </h3>
        <p style={{
        margin: 0,
        fontSize: "14px",
        color: "var(--color-fg-muted)"
      }}>
          Card with emoji content 🎉
        </p>
      </div>
  }
}`,...f.parameters?.docs?.source},description:{story:`带 Emoji 的卡片

验证 emoji 正确显示`,...f.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Card"
  },
  parameters: {
    layout: "padded"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem"
  }}>
      {variants.map(variant => <div key={variant}>
          <div style={{
        marginBottom: "0.5rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }}>
            {variant}
          </div>
          <div style={{
        display: "flex",
        gap: "1rem"
      }}>
            <Card variant={variant}>
              <div style={{
            minWidth: "120px"
          }}>
                <strong>Normal</strong>
                <p style={{
              margin: "0.5rem 0 0",
              fontSize: "12px",
              color: "var(--color-fg-muted)"
            }}>
                  Default state
                </p>
              </div>
            </Card>
            <Card variant={variant} hoverable>
              <div style={{
            minWidth: "120px"
          }}>
                <strong>Hoverable</strong>
                <p style={{
              margin: "0.5rem 0 0",
              fontSize: "12px",
              color: "var(--color-fg-muted)"
            }}>
                  Hover me
                </p>
              </div>
            </Card>
          </div>
        </div>)}
    </div>
}`,...v.parameters?.docs?.source},description:{story:`完整 Variant 矩阵

展示所有 3 种 variant 的组合`,...v.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Card"
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
      {/* Variants */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Variants
        </h3>
        <div style={{
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap"
      }}>
          {variants.map(variant => <Card key={variant} variant={variant}>
              <div style={{
            minWidth: "120px"
          }}>
                <strong>{variant}</strong>
                <p style={{
              margin: "0.5rem 0 0",
              fontSize: "12px",
              color: "var(--color-fg-muted)"
            }}>
                  Card variant
                </p>
              </div>
            </Card>)}
        </div>
      </section>

      {/* Hoverable States */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Hoverable States
        </h3>
        <div style={{
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap"
      }}>
          {variants.map(variant => <Card key={variant} variant={variant} hoverable>
              <div style={{
            minWidth: "120px"
          }}>
                <strong>{variant} + hoverable</strong>
                <p style={{
              margin: "0.5rem 0 0",
              fontSize: "12px",
              color: "var(--color-fg-muted)"
            }}>
                  Hover to see effect
                </p>
              </div>
            </Card>)}
        </div>
      </section>

      {/* Padding Options */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Padding Options
        </h3>
        <div style={{
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap"
      }}>
          <Card>
            <div style={{
            minWidth: "120px"
          }}>
              <strong>With Padding</strong>
              <p style={{
              margin: "0.5rem 0 0",
              fontSize: "12px",
              color: "var(--color-fg-muted)"
            }}>
                Default padding (24px)
              </p>
            </div>
          </Card>
          <Card noPadding>
            <div style={{
            padding: "1rem",
            background: "var(--color-bg-muted)",
            minWidth: "120px"
          }}>
              <strong>No Padding</strong>
              <p style={{
              margin: "0.5rem 0 0",
              fontSize: "12px",
              color: "var(--color-fg-muted)"
            }}>
                Custom layout
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Slot Pattern */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Slot Pattern (Header + Content + Footer)
        </h3>
        <div style={{
        maxWidth: "400px"
      }}>
          <Card>
            <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid var(--color-border-default)"
          }}>
              <h4 style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 600
            }}>Header</h4>
              <span style={{
              color: "var(--color-fg-muted)"
            }}>...</span>
            </div>
            <p style={{
            margin: "0 0 1rem",
            fontSize: "13px",
            color: "var(--color-fg-muted)"
          }}>
              Main content area of the card.
            </p>
            <div style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--color-border-default)"
          }}>
              <span style={{
              fontSize: "12px",
              color: "var(--color-fg-muted)"
            }}>Footer</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Edge Cases */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Edge Cases
        </h3>
        <div style={{
        display: "flex",
        gap: "1rem",
        flexWrap: "wrap",
        alignItems: "flex-start"
      }}>
          <Card>
            <div style={{
            minWidth: "100px",
            height: "30px"
          }}>
              <strong>Empty</strong>
            </div>
          </Card>
          <Card>
            <Card variant="bordered">
              <strong>Nested</strong>
            </Card>
          </Card>
          <Card>
            <strong>🚀 Emoji</strong>
          </Card>
        </div>
      </section>
    </div>
}`,...y.parameters?.docs?.source},description:{story:`完整状态展示（用于 AI 自检）

包含所有 variant、hoverable 状态的完整矩阵，便于一次性检查`,...y.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Card"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap"
  }}>
      <Card hoverable style={{
      width: "250px"
    }}>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "16px",
        fontWeight: 600
      }}>
          我的小说项目
        </h3>
        <p style={{
        margin: "0 0 1rem",
        fontSize: "13px",
        color: "var(--color-fg-muted)"
      }}>
          科幻小说创作，目前第三章进行中...
        </p>
        <div style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          <span>12,345 字</span>
          <span>2 天前</span>
        </div>
      </Card>
      <Card hoverable style={{
      width: "250px"
    }}>
        <h3 style={{
        margin: "0 0 0.5rem",
        fontSize: "16px",
        fontWeight: 600
      }}>
          商业计划书
        </h3>
        <p style={{
        margin: "0 0 1rem",
        fontSize: "13px",
        color: "var(--color-fg-muted)"
      }}>
          创业项目商业计划书初稿...
        </p>
        <div style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          <span>5,678 字</span>
          <span>1 周前</span>
        </div>
      </Card>
    </div>
}`,...u.parameters?.docs?.source},description:{story:`项目卡片场景

模拟真实的项目列表卡片`,...u.parameters?.docs?.description}}};j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Card"
  },
  parameters: {
    layout: "padded"
  },
  render: () => <div style={{
    maxWidth: "500px",
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  }}>
      <Card>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "16px",
        fontWeight: 600
      }}>外观设置</h3>
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}>
          <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
            <span style={{
            fontSize: "14px"
          }}>主题</span>
            <span style={{
            fontSize: "14px",
            color: "var(--color-fg-muted)"
          }}>深色</span>
          </div>
          <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
            <span style={{
            fontSize: "14px"
          }}>字体大小</span>
            <span style={{
            fontSize: "14px",
            color: "var(--color-fg-muted)"
          }}>中</span>
          </div>
        </div>
      </Card>
      <Card>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "16px",
        fontWeight: 600
      }}>AI 设置</h3>
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}>
          <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
            <span style={{
            fontSize: "14px"
          }}>模型</span>
            <span style={{
            fontSize: "14px",
            color: "var(--color-fg-muted)"
          }}>GPT-4</span>
          </div>
          <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
            <span style={{
            fontSize: "14px"
          }}>创意度</span>
            <span style={{
            fontSize: "14px",
            color: "var(--color-fg-muted)"
          }}>0.7</span>
          </div>
        </div>
      </Card>
    </div>
}`,...j.parameters?.docs?.source},description:{story:`设置面板卡片场景

模拟设置页面中的分组卡片`,...j.parameters?.docs?.description}}};const w=["Default","Raised","Bordered","Hoverable","HoverableRaised","NoPadding","AllVariants","AllHoverable","WithSlots","EmptyContent","LongContent","LongContentConstrained","NestedCards","WithEmoji","VariantMatrix","FullMatrix","ProjectCardScenario","SettingsCardScenario"];export{c as AllHoverable,l as AllVariants,a as Bordered,t as Default,m as EmptyContent,y as FullMatrix,i as Hoverable,s as HoverableRaised,g as LongContent,h as LongContentConstrained,x as NestedCards,d as NoPadding,u as ProjectCardScenario,o as Raised,j as SettingsCardScenario,v as VariantMatrix,f as WithEmoji,p as WithSlots,w as __namedExportsOrder,W as default};
