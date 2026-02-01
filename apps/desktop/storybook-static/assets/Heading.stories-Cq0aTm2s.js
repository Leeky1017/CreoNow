import{j as e}from"./jsx-runtime-BLchON5X.js";import{H as r}from"./Heading-BzOyC2Oj.js";import"./index-kA4PVysc.js";const T={title:"Primitives/Heading",component:r,parameters:{layout:"centered",docs:{description:{component:`Heading 组件 Story

设计规范 §4.2 Typography
标题组件，提供语义化和视觉一致的标题样式。

Level 变体：
- h1: 24px, 600, 1.2, -0.02em
- h2: 16px, 600, 1.3, -0.01em
- h3: 14px, 500, 1.4, 0
- h4: 13px, 500, 1.4, 0

Color 变体：
- default, muted, subtle`}}},tags:["autodocs"],argTypes:{level:{control:"select",options:["h1","h2","h3","h4"],description:"Heading level (semantic and visual)"},as:{control:"select",options:["h1","h2","h3","h4"],description:"Visual style override"},color:{control:"select",options:["default","muted","subtle"],description:"Text color"}}},s={args:{children:"Default Heading"}},a={args:{level:"h1",children:"Page Title (H1)"}},o={args:{level:"h2",children:"Section Header (H2)"}},i={args:{level:"h3",children:"Subsection (H3)"}},l={args:{level:"h4",children:"Small Header (H4)"}},H=["h1","h2","h3","h4"],t={args:{children:"Heading"},render:()=>e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:H.map(n=>e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:"1rem"},children:[e.jsx("span",{style:{width:"40px",fontSize:"12px",color:"var(--color-fg-muted)"},children:n}),e.jsxs(r,{level:n,children:["Heading Level ",n.toUpperCase()]})]},n))})},f=["default","muted","subtle"],d={args:{children:"Heading"},render:()=>e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:f.map(n=>e.jsxs(r,{level:"h2",color:n,children:[n.charAt(0).toUpperCase()+n.slice(1)," Color Heading"]},n))})},c={args:{children:"Heading"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:[e.jsxs("div",{children:[e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"h2 level, h1 visual:"}),e.jsx(r,{level:"h2",as:"h1",children:"Looks like H1, semantic H2"})]}),e.jsxs("div",{children:[e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"h1 level, h3 visual:"}),e.jsx(r,{level:"h1",as:"h3",children:"Looks like H3, semantic H1"})]})]})},p={args:{children:"Heading"},parameters:{layout:"padded"},render:()=>e.jsxs("div",{style:{maxWidth:"600px"},children:[e.jsx(r,{level:"h1",children:"Project Settings"}),e.jsx("p",{style:{margin:"0.5rem 0 2rem",fontSize:"13px",color:"var(--color-fg-muted)"},children:"Manage your project configuration and preferences."}),e.jsx(r,{level:"h2",children:"General"}),e.jsx("p",{style:{margin:"0.5rem 0 1.5rem",fontSize:"13px"},children:"Basic project information and settings."}),e.jsx(r,{level:"h3",children:"Project Name"}),e.jsx("p",{style:{margin:"0.5rem 0 1rem",fontSize:"13px"},children:"The display name for your project."}),e.jsx(r,{level:"h3",children:"Description"}),e.jsx("p",{style:{margin:"0.5rem 0 1rem",fontSize:"13px"},children:"A brief description of your project."}),e.jsx(r,{level:"h2",style:{marginTop:"2rem"},children:"Advanced"}),e.jsx("p",{style:{margin:"0.5rem 0 1rem",fontSize:"13px"},children:"Advanced configuration options."}),e.jsx(r,{level:"h4",color:"muted",children:"Experimental Features"}),e.jsx("p",{style:{margin:"0.5rem 0",fontSize:"13px",color:"var(--color-fg-muted)"},children:"Enable experimental features at your own risk."})]})},m={args:{level:"h3",children:"Card Title"},decorators:[n=>e.jsxs("div",{style:{padding:"1rem",background:"var(--color-bg-raised)",border:"1px solid var(--color-border-default)",borderRadius:"var(--radius-md)",width:"300px"},children:[e.jsx(n,{}),e.jsx("p",{style:{margin:"0.5rem 0 0",fontSize:"13px",color:"var(--color-fg-muted)"},children:"Card description text goes here."})]})]},g={args:{level:"h4",color:"muted",children:"SECTION"},decorators:[n=>e.jsx("div",{style:{padding:"1rem",background:"var(--color-bg-surface)",width:"200px"},children:e.jsx(n,{})})]},h={args:{level:"h1",children:"This is an extremely long heading that might wrap to multiple lines depending on the container width"},decorators:[n=>e.jsx("div",{style:{maxWidth:"400px"},children:e.jsx(n,{})})]},u={args:{level:"h1",children:"Hi"}},v={args:{level:"h2",children:"Welcome! "}},x={args:{level:"h2",className:"custom-heading",children:"Custom Styled Heading"}},y={args:{children:"Heading"},parameters:{layout:"fullscreen"},render:()=>e.jsxs("div",{style:{padding:"2rem",display:"flex",flexDirection:"column",gap:"2rem"},children:[e.jsxs("section",{children:[e.jsx(r,{level:"h4",color:"muted",style:{marginBottom:"0.5rem"},children:"LEVEL VARIANTS"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:H.map(n=>e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:"1rem"},children:[e.jsx("span",{style:{width:"40px",fontSize:"12px",color:"var(--color-fg-muted)"},children:n}),e.jsxs(r,{level:n,children:["Heading ",n.toUpperCase()]})]},n))})]}),e.jsxs("section",{children:[e.jsx(r,{level:"h4",color:"muted",style:{marginBottom:"0.5rem"},children:"COLOR VARIANTS"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:f.map(n=>e.jsxs(r,{level:"h3",color:n,children:[n,": Sample heading"]},n))})]}),e.jsxs("section",{children:[e.jsx(r,{level:"h4",color:"muted",style:{marginBottom:"0.5rem"},children:"DOCUMENT HIERARCHY"}),e.jsxs("div",{style:{padding:"1rem",background:"var(--color-bg-surface)",borderRadius:"var(--radius-md)"},children:[e.jsx(r,{level:"h1",children:"H1: Page Title"}),e.jsx(r,{level:"h2",style:{marginTop:"1rem"},children:"H2: Section"}),e.jsx(r,{level:"h3",style:{marginTop:"0.5rem"},children:"H3: Subsection"}),e.jsx(r,{level:"h4",style:{marginTop:"0.5rem"},children:"H4: Detail"})]})]})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Default Heading"
  }
}`,...s.parameters?.docs?.source},description:{story:"默认 Heading (h2)",...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    level: "h1",
    children: "Page Title (H1)"
  }
}`,...a.parameters?.docs?.source},description:{story:"H1 - 页面标题",...a.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    level: "h2",
    children: "Section Header (H2)"
  }
}`,...o.parameters?.docs?.source},description:{story:"H2 - 区块标题",...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    level: "h3",
    children: "Subsection (H3)"
  }
}`,...i.parameters?.docs?.source},description:{story:"H3 - 子区块标题",...i.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    level: "h4",
    children: "Small Header (H4)"
  }
}`,...l.parameters?.docs?.source},description:{story:"H4 - 最小标题",...l.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Heading"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  }}>
      {levels.map(level => <div key={level} style={{
      display: "flex",
      alignItems: "baseline",
      gap: "1rem"
    }}>
          <span style={{
        width: "40px",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
            {level}
          </span>
          <Heading level={level}>Heading Level {level.toUpperCase()}</Heading>
        </div>)}
    </div>
}`,...t.parameters?.docs?.source},description:{story:"所有 Level 变体",...t.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Heading"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  }}>
      {colors.map(color => <Heading key={color} level="h2" color={color}>
          {color.charAt(0).toUpperCase() + color.slice(1)} Color Heading
        </Heading>)}
    </div>
}`,...d.parameters?.docs?.source},description:{story:"所有 Color 变体",...d.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Heading"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  }}>
      <div>
        <span style={{
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          h2 level, h1 visual:
        </span>
        <Heading level="h2" as="h1">
          Looks like H1, semantic H2
        </Heading>
      </div>
      <div>
        <span style={{
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          h1 level, h3 visual:
        </span>
        <Heading level="h1" as="h3">
          Looks like H3, semantic H1
        </Heading>
      </div>
    </div>
}`,...c.parameters?.docs?.source},description:{story:"语义 vs 视觉分离\n\n使用 `as` 属性可以让标题保持语义（level）但使用不同的视觉样式。",...c.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Heading"
  },
  parameters: {
    layout: "padded"
  },
  render: () => <div style={{
    maxWidth: "600px"
  }}>
      <Heading level="h1">Project Settings</Heading>
      <p style={{
      margin: "0.5rem 0 2rem",
      fontSize: "13px",
      color: "var(--color-fg-muted)"
    }}>
        Manage your project configuration and preferences.
      </p>

      <Heading level="h2">General</Heading>
      <p style={{
      margin: "0.5rem 0 1.5rem",
      fontSize: "13px"
    }}>
        Basic project information and settings.
      </p>

      <Heading level="h3">Project Name</Heading>
      <p style={{
      margin: "0.5rem 0 1rem",
      fontSize: "13px"
    }}>
        The display name for your project.
      </p>

      <Heading level="h3">Description</Heading>
      <p style={{
      margin: "0.5rem 0 1rem",
      fontSize: "13px"
    }}>
        A brief description of your project.
      </p>

      <Heading level="h2" style={{
      marginTop: "2rem"
    }}>
        Advanced
      </Heading>
      <p style={{
      margin: "0.5rem 0 1rem",
      fontSize: "13px"
    }}>
        Advanced configuration options.
      </p>

      <Heading level="h4" color="muted">
        Experimental Features
      </Heading>
      <p style={{
      margin: "0.5rem 0",
      fontSize: "13px",
      color: "var(--color-fg-muted)"
    }}>
        Enable experimental features at your own risk.
      </p>
    </div>
}`,...p.parameters?.docs?.source},description:{story:"页面布局",...p.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    level: "h3",
    children: "Card Title"
  },
  decorators: [Story => <div style={{
    padding: "1rem",
    background: "var(--color-bg-raised)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
    width: "300px"
  }}>
        <Story />
        <p style={{
      margin: "0.5rem 0 0",
      fontSize: "13px",
      color: "var(--color-fg-muted)"
    }}>
          Card description text goes here.
        </p>
      </div>]
}`,...m.parameters?.docs?.source},description:{story:"卡片标题",...m.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    level: "h4",
    color: "muted",
    children: "SECTION"
  },
  decorators: [Story => <div style={{
    padding: "1rem",
    background: "var(--color-bg-surface)",
    width: "200px"
  }}>
        <Story />
      </div>]
}`,...g.parameters?.docs?.source},description:{story:"侧边栏标题",...g.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    level: "h1",
    children: "This is an extremely long heading that might wrap to multiple lines depending on the container width"
  },
  decorators: [Story => <div style={{
    maxWidth: "400px"
  }}>
        <Story />
      </div>]
}`,...h.parameters?.docs?.source},description:{story:"长标题",...h.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    level: "h1",
    children: "Hi"
  }
}`,...u.parameters?.docs?.source},description:{story:"短标题",...u.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    level: "h2",
    children: "Welcome! "
  }
}`,...v.parameters?.docs?.source},description:{story:"带 emoji",...v.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    level: "h2",
    className: "custom-heading",
    children: "Custom Styled Heading"
  }
}`,...x.parameters?.docs?.source},description:{story:"自定义 className",...x.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Heading"
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
      {/* Levels */}
      <section>
        <Heading level="h4" color="muted" style={{
        marginBottom: "0.5rem"
      }}>
          LEVEL VARIANTS
        </Heading>
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem"
      }}>
          {levels.map(level => <div key={level} style={{
          display: "flex",
          alignItems: "baseline",
          gap: "1rem"
        }}>
              <span style={{
            width: "40px",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
                {level}
              </span>
              <Heading level={level}>Heading {level.toUpperCase()}</Heading>
            </div>)}
        </div>
      </section>

      {/* Colors */}
      <section>
        <Heading level="h4" color="muted" style={{
        marginBottom: "0.5rem"
      }}>
          COLOR VARIANTS
        </Heading>
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem"
      }}>
          {colors.map(color => <Heading key={color} level="h3" color={color}>
              {color}: Sample heading
            </Heading>)}
        </div>
      </section>

      {/* Hierarchy */}
      <section>
        <Heading level="h4" color="muted" style={{
        marginBottom: "0.5rem"
      }}>
          DOCUMENT HIERARCHY
        </Heading>
        <div style={{
        padding: "1rem",
        background: "var(--color-bg-surface)",
        borderRadius: "var(--radius-md)"
      }}>
          <Heading level="h1">H1: Page Title</Heading>
          <Heading level="h2" style={{
          marginTop: "1rem"
        }}>
            H2: Section
          </Heading>
          <Heading level="h3" style={{
          marginTop: "0.5rem"
        }}>
            H3: Subsection
          </Heading>
          <Heading level="h4" style={{
          marginTop: "0.5rem"
        }}>
            H4: Detail
          </Heading>
        </div>
      </section>
    </div>
}`,...y.parameters?.docs?.source},description:{story:"完整功能展示（用于 AI 自检）",...y.parameters?.docs?.description}}};const C=["Default","H1","H2","H3","H4","AllLevels","AllColors","SemanticVsVisual","PageLayout","CardTitle","SidebarTitle","LongTitle","ShortTitle","WithEmoji","CustomClassName","FullMatrix"];export{d as AllColors,t as AllLevels,m as CardTitle,x as CustomClassName,s as Default,y as FullMatrix,a as H1,o as H2,i as H3,l as H4,h as LongTitle,p as PageLayout,c as SemanticVsVisual,u as ShortTitle,g as SidebarTitle,v as WithEmoji,C as __namedExportsOrder,T as default};
