import{j as e}from"./jsx-runtime-BLchON5X.js";import{T as s}from"./Text-CW-Kyc9R.js";import"./index-kA4PVysc.js";const D={title:"Primitives/Text",component:s,parameters:{layout:"centered",docs:{description:{component:`Text 组件 Story

设计规范 §4.2 Typography
文本组件，提供统一的排版样式。

Size 变体：
- body: 13px, 400, 1.5 (默认)
- bodyLarge: 16px, 400, 1.8
- small: 12px, 400, 1.4
- tiny: 11px, 400, 1.2
- label: 10px, 500, 1.2, uppercase
- code: 13px, mono, 400, 1.5

Color 变体：
- default, muted, subtle, placeholder
- error, success, warning, info`}}},tags:["autodocs"],argTypes:{size:{control:"select",options:["body","bodyLarge","small","tiny","label","code"],description:"Typography size variant"},color:{control:"select",options:["default","muted","subtle","placeholder","error","success","warning","info"],description:"Text color"},weight:{control:"select",options:["normal","medium","semibold","bold"],description:"Font weight override"},as:{control:"select",options:["span","p","div","label"],description:"Render as different element"}}},n={args:{children:"This is default body text."}},o={args:{size:"body",children:"Body text at 13px with normal weight."}},t={args:{size:"bodyLarge",children:"Body large text at 16px for editor content."}},i={args:{size:"small",children:"Small text at 12px for secondary information."}},a={args:{size:"tiny",children:"Tiny text at 11px for timestamps and metadata."}},l={args:{size:"label",children:"Section Label"}},d={args:{size:"code",children:'console.log("Hello, World!");'}},j=["body","bodyLarge","small","tiny","label","code"],c={args:{children:"Text"},render:()=>e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:j.map(r=>e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:"1rem"},children:[e.jsx("span",{style:{width:"80px",fontSize:"12px",color:"var(--color-fg-muted)"},children:r}),e.jsx(s,{size:r,children:r==="code"?'const example = "code";':r==="label"?"LABEL TEXT":"The quick brown fox jumps over the lazy dog."})]},r))})},w=["default","muted","subtle","placeholder","error","success","warning","info"],m={args:{children:"Text"},render:()=>e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:w.map(r=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"1rem"},children:[e.jsx("span",{style:{width:"80px",fontSize:"12px",color:"var(--color-fg-muted)"},children:r}),e.jsxs(s,{color:r,children:["This is ",r," colored text."]})]},r))})},p={args:{children:"Text"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:[e.jsx(s,{weight:"normal",children:"Normal weight (400)"}),e.jsx(s,{weight:"medium",children:"Medium weight (500)"}),e.jsx(s,{weight:"semibold",children:"Semibold weight (600)"}),e.jsx(s,{weight:"bold",children:"Bold weight (700)"})]})},x={args:{children:"Text"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:[e.jsx(s,{as:"span",children:"Rendered as span (default)"}),e.jsx(s,{as:"p",children:"Rendered as paragraph"}),e.jsx(s,{as:"div",children:"Rendered as div"}),e.jsx(s,{as:"label",children:"Rendered as label"})]})},u={args:{as:"p",size:"body",children:"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris."},decorators:[r=>e.jsx("div",{style:{maxWidth:"400px"},children:e.jsx(r,{})})]},g={args:{size:"small",color:"muted",children:"This is helper text that provides additional context."}},h={args:{size:"small",color:"error",children:"This field is required."}},y={args:{size:"small",color:"success",children:"Changes saved successfully."}},T={args:{size:"tiny",color:"subtle",children:"2 hours ago"}},b={args:{size:"code",children:"npm install @creonow/core"},decorators:[r=>e.jsx("div",{style:{padding:"0.5rem 1rem",background:"var(--color-bg-surface)",borderRadius:"var(--radius-sm)"},children:e.jsx(r,{})})]},f={args:{children:"This is an extremely long text that might wrap to multiple lines depending on the container width. It should handle wrapping gracefully without breaking the layout or causing any visual issues."},decorators:[r=>e.jsx("div",{style:{maxWidth:"300px"},children:e.jsx(r,{})})]},v={args:{as:"p",children:`Line 1
Line 2
Line 3`},decorators:[r=>e.jsx("div",{style:{whiteSpace:"pre-line"},children:e.jsx(r,{})})]},S={args:{children:""}},z={args:{children:"Text"},parameters:{layout:"fullscreen"},render:()=>e.jsxs("div",{style:{padding:"2rem",display:"flex",flexDirection:"column",gap:"2rem"},children:[e.jsxs("section",{children:[e.jsx(s,{size:"label",color:"muted",as:"div",style:{marginBottom:"0.5rem"},children:"SIZE VARIANTS"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:j.map(r=>e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:"1rem"},children:[e.jsx(s,{size:"tiny",color:"muted",style:{width:"80px"},children:r}),e.jsx(s,{size:r,children:r==="code"?"const x = 1;":r==="label"?"LABEL":"Sample text"})]},r))})]}),e.jsxs("section",{children:[e.jsx(s,{size:"label",color:"muted",as:"div",style:{marginBottom:"0.5rem"},children:"COLOR VARIANTS"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"0.25rem"},children:w.map(r=>e.jsxs(s,{color:r,children:[r,": Sample text"]},r))})]}),e.jsxs("section",{children:[e.jsx(s,{size:"label",color:"muted",as:"div",style:{marginBottom:"0.5rem"},children:"WEIGHT VARIANTS"}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.25rem"},children:[e.jsx(s,{weight:"normal",children:"Normal (400)"}),e.jsx(s,{weight:"medium",children:"Medium (500)"}),e.jsx(s,{weight:"semibold",children:"Semibold (600)"}),e.jsx(s,{weight:"bold",children:"Bold (700)"})]})]}),e.jsxs("section",{children:[e.jsx(s,{size:"label",color:"muted",as:"div",style:{marginBottom:"0.5rem"},children:"COMBINED USAGE"}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:[e.jsx(s,{size:"bodyLarge",weight:"semibold",children:"Article Title"}),e.jsx(s,{size:"body",color:"muted",children:"By Author Name"}),e.jsx(s,{size:"body",as:"p",children:"This is the article body text that contains the main content."}),e.jsx(s,{size:"small",color:"subtle",children:"Last updated 2 hours ago"})]})]})]})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    children: "This is default body text."
  }
}`,...n.parameters?.docs?.source},description:{story:"默认 Text (body)",...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    size: "body",
    children: "Body text at 13px with normal weight."
  }
}`,...o.parameters?.docs?.source},description:{story:"Body 变体",...o.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    size: "bodyLarge",
    children: "Body large text at 16px for editor content."
  }
}`,...t.parameters?.docs?.source},description:{story:"Body Large 变体",...t.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    size: "small",
    children: "Small text at 12px for secondary information."
  }
}`,...i.parameters?.docs?.source},description:{story:"Small 变体",...i.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    size: "tiny",
    children: "Tiny text at 11px for timestamps and metadata."
  }
}`,...a.parameters?.docs?.source},description:{story:"Tiny 变体",...a.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    size: "label",
    children: "Section Label"
  }
}`,...l.parameters?.docs?.source},description:{story:"Label 变体",...l.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    size: "code",
    children: 'console.log("Hello, World!");'
  }
}`,...d.parameters?.docs?.source},description:{story:"Code 变体",...d.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Text"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  }}>
      {sizes.map(size => <div key={size} style={{
      display: "flex",
      alignItems: "baseline",
      gap: "1rem"
    }}>
          <span style={{
        width: "80px",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
            {size}
          </span>
          <Text size={size}>
            {size === "code" ? 'const example = "code";' : size === "label" ? "LABEL TEXT" : "The quick brown fox jumps over the lazy dog."}
          </Text>
        </div>)}
    </div>
}`,...c.parameters?.docs?.source},description:{story:"所有 Size 变体",...c.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Text"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  }}>
      {colors.map(color => <div key={color} style={{
      display: "flex",
      alignItems: "center",
      gap: "1rem"
    }}>
          <span style={{
        width: "80px",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
            {color}
          </span>
          <Text color={color}>This is {color} colored text.</Text>
        </div>)}
    </div>
}`,...m.parameters?.docs?.source},description:{story:"所有 Color 变体",...m.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Text"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  }}>
      <Text weight="normal">Normal weight (400)</Text>
      <Text weight="medium">Medium weight (500)</Text>
      <Text weight="semibold">Semibold weight (600)</Text>
      <Text weight="bold">Bold weight (700)</Text>
    </div>
}`,...p.parameters?.docs?.source},description:{story:"所有 Weight 变体",...p.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Text"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem"
  }}>
      <Text as="span">Rendered as span (default)</Text>
      <Text as="p">Rendered as paragraph</Text>
      <Text as="div">Rendered as div</Text>
      <Text as="label">Rendered as label</Text>
    </div>
}`,...x.parameters?.docs?.source},description:{story:"不同元素渲染",...x.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    as: "p",
    size: "body",
    children: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris."
  },
  decorators: [Story => <div style={{
    maxWidth: "400px"
  }}>
        <Story />
      </div>]
}`,...u.parameters?.docs?.source},description:{story:"段落文本",...u.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    size: "small",
    color: "muted",
    children: "This is helper text that provides additional context."
  }
}`,...g.parameters?.docs?.source},description:{story:"辅助文本",...g.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    size: "small",
    color: "error",
    children: "This field is required."
  }
}`,...h.parameters?.docs?.source},description:{story:"错误消息",...h.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    size: "small",
    color: "success",
    children: "Changes saved successfully."
  }
}`,...y.parameters?.docs?.source},description:{story:"成功消息",...y.parameters?.docs?.description}}};T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    size: "tiny",
    color: "subtle",
    children: "2 hours ago"
  }
}`,...T.parameters?.docs?.source},description:{story:"时间戳",...T.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    size: "code",
    children: "npm install @creonow/core"
  },
  decorators: [Story => <div style={{
    padding: "0.5rem 1rem",
    background: "var(--color-bg-surface)",
    borderRadius: "var(--radius-sm)"
  }}>
        <Story />
      </div>]
}`,...b.parameters?.docs?.source},description:{story:"代码片段",...b.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    children: "This is an extremely long text that might wrap to multiple lines depending on the container width. It should handle wrapping gracefully without breaking the layout or causing any visual issues."
  },
  decorators: [Story => <div style={{
    maxWidth: "300px"
  }}>
        <Story />
      </div>]
}`,...f.parameters?.docs?.source},description:{story:"长文本",...f.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    as: "p",
    children: "Line 1\\nLine 2\\nLine 3"
  },
  decorators: [Story => <div style={{
    whiteSpace: "pre-line"
  }}>
        <Story />
      </div>]
}`,...v.parameters?.docs?.source},description:{story:"带换行的文本",...v.parameters?.docs?.description}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    children: ""
  }
}`,...S.parameters?.docs?.source},description:{story:"空文本",...S.parameters?.docs?.description}}};z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Text"
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
      {/* Sizes */}
      <section>
        <Text size="label" color="muted" as="div" style={{
        marginBottom: "0.5rem"
      }}>
          SIZE VARIANTS
        </Text>
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem"
      }}>
          {sizes.map(size => <div key={size} style={{
          display: "flex",
          alignItems: "baseline",
          gap: "1rem"
        }}>
              <Text size="tiny" color="muted" style={{
            width: "80px"
          }}>
                {size}
              </Text>
              <Text size={size}>
                {size === "code" ? "const x = 1;" : size === "label" ? "LABEL" : "Sample text"}
              </Text>
            </div>)}
        </div>
      </section>

      {/* Colors */}
      <section>
        <Text size="label" color="muted" as="div" style={{
        marginBottom: "0.5rem"
      }}>
          COLOR VARIANTS
        </Text>
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem"
      }}>
          {colors.map(color => <Text key={color} color={color}>
              {color}: Sample text
            </Text>)}
        </div>
      </section>

      {/* Weights */}
      <section>
        <Text size="label" color="muted" as="div" style={{
        marginBottom: "0.5rem"
      }}>
          WEIGHT VARIANTS
        </Text>
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem"
      }}>
          <Text weight="normal">Normal (400)</Text>
          <Text weight="medium">Medium (500)</Text>
          <Text weight="semibold">Semibold (600)</Text>
          <Text weight="bold">Bold (700)</Text>
        </div>
      </section>

      {/* Combined */}
      <section>
        <Text size="label" color="muted" as="div" style={{
        marginBottom: "0.5rem"
      }}>
          COMBINED USAGE
        </Text>
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem"
      }}>
          <Text size="bodyLarge" weight="semibold">
            Article Title
          </Text>
          <Text size="body" color="muted">
            By Author Name
          </Text>
          <Text size="body" as="p">
            This is the article body text that contains the main content.
          </Text>
          <Text size="small" color="subtle">
            Last updated 2 hours ago
          </Text>
        </div>
      </section>
    </div>
}`,...z.parameters?.docs?.source},description:{story:"完整功能展示（用于 AI 自检）",...z.parameters?.docs?.description}}};const E=["Default","Body","BodyLarge","Small","Tiny","Label","Code","AllSizes","AllColors","AllWeights","AsElements","Paragraph","HelperText","ErrorMessage","SuccessMessage","Timestamp","CodeSnippet","LongText","WithLineBreaks","Empty","FullMatrix"];export{m as AllColors,c as AllSizes,p as AllWeights,x as AsElements,o as Body,t as BodyLarge,d as Code,b as CodeSnippet,n as Default,S as Empty,h as ErrorMessage,z as FullMatrix,g as HelperText,l as Label,f as LongText,u as Paragraph,i as Small,y as SuccessMessage,T as Timestamp,a as Tiny,v as WithLineBreaks,E as __namedExportsOrder,D as default};
