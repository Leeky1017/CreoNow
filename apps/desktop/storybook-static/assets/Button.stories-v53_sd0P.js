import{j as r}from"./jsx-runtime-BLchON5X.js";import{B as e}from"./Button-B9XLIlTV.js";import"./index-kA4PVysc.js";const P={title:"Primitives/Button",component:e,parameters:{layout:"centered",docs:{description:{component:`Button 组件 Story

设计规范 §6.1
支持多种 variant（primary, secondary, ghost, danger）和 size（sm, md, lg）。

状态矩阵（MUST 全部实现）：
- default: 正常颜色，可点击
- hover: 视觉反馈（需要交互触发）
- active: 按下反馈（需要交互触发）
- focus-visible: 显示 focus ring（Tab 键聚焦）
- disabled: opacity: 0.5，不可点击
- loading: 显示 Spinner，不可点击`}}},tags:["autodocs"],argTypes:{variant:{control:"select",options:["primary","secondary","ghost","danger"],description:"Visual style variant"},size:{control:"select",options:["sm","md","lg"],description:"Size of the button"},loading:{control:"boolean",description:"Show loading spinner and disable interactions"},fullWidth:{control:"boolean",description:"Full width button"},disabled:{control:"boolean",description:"Disable the button"}}},s={args:{children:"Button",variant:"secondary",size:"md"}},i={args:{children:"Primary Button",variant:"primary",size:"md"}},o={args:{children:"Secondary Button",variant:"secondary",size:"md"}},d={args:{children:"Ghost Button",variant:"ghost",size:"md"}},c={args:{children:"Danger Button",variant:"danger",size:"md"}},l={args:{children:"Small Button",variant:"secondary",size:"sm"}},p={args:{children:"Medium Button",variant:"secondary",size:"md"}},m={args:{children:"Large Button",variant:"secondary",size:"lg"}},u={args:{children:"Loading...",variant:"primary",size:"md",loading:!0}},g={args:{children:"Disabled Button",variant:"secondary",size:"md",disabled:!0}},y={args:{children:"Full Width Button",variant:"primary",size:"md",fullWidth:!0},parameters:{layout:"padded"}},v={args:{children:"Button"},render:()=>r.jsxs("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:[r.jsx(e,{variant:"primary",children:"Primary"}),r.jsx(e,{variant:"secondary",children:"Secondary"}),r.jsx(e,{variant:"ghost",children:"Ghost"}),r.jsx(e,{variant:"danger",children:"Danger"})]})},h={args:{children:"Button"},render:()=>r.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:[r.jsx(e,{size:"sm",children:"Small"}),r.jsx(e,{size:"md",children:"Medium"}),r.jsx(e,{size:"lg",children:"Large"})]})},t=["primary","secondary","ghost","danger"],w=["sm","md","lg"],x={args:{children:"Button"},parameters:{layout:"padded"},render:()=>r.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1.5rem"},children:t.map(n=>r.jsxs("div",{children:[r.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)",textTransform:"uppercase",letterSpacing:"0.05em"},children:n}),r.jsx("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:w.map(a=>r.jsx(e,{variant:n,size:a,children:a.toUpperCase()},`${n}-${a}`))})]},n))})},f={args:{children:"Button"},render:()=>r.jsx("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:t.map(n=>r.jsxs(e,{variant:n,disabled:!0,children:[n," (disabled)"]},n))})},B={args:{children:"Button"},render:()=>r.jsx("div",{style:{display:"flex",gap:"1rem",flexWrap:"wrap"},children:t.map(n=>r.jsx(e,{variant:n,loading:!0,children:n},n))})},S={args:{children:"This is a very long button text that might overflow in some containers",variant:"secondary",size:"md"}},z={args:{children:"Button"},parameters:{layout:"padded"},render:()=>r.jsx("div",{style:{width:"150px",border:"1px dashed var(--color-border-default)"},children:r.jsx(e,{fullWidth:!0,children:"Very Long Button Text That Should Handle Overflow"})})},j={args:{children:"OK",variant:"primary",size:"sm"}},b={args:{children:"X",variant:"danger",size:"sm"}},D={args:{children:"Button"},render:()=>r.jsxs("div",{style:{display:"flex",gap:"1rem"},children:[r.jsx(e,{variant:"primary",children:"🚀 Launch"}),r.jsx(e,{variant:"secondary",children:"💾 Save"}),r.jsx(e,{variant:"danger",children:"🗑️ Delete"})]})},W={args:{children:"Button"},parameters:{docs:{description:{story:"使用 Tab 键聚焦到按钮，验证 focus ring 是否正确显示"}}},render:()=>r.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:[r.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Tab →"}),r.jsx(e,{variant:"primary",children:"Primary Focus"}),r.jsx(e,{variant:"secondary",children:"Secondary Focus"}),r.jsx(e,{variant:"ghost",children:"Ghost Focus"}),r.jsx(e,{variant:"danger",children:"Danger Focus"})]})},F={args:{children:"Button"},render:()=>r.jsxs("div",{style:{display:"flex",gap:"0.5rem"},children:[r.jsx(e,{variant:"secondary",children:"Cancel"}),r.jsx(e,{variant:"primary",children:"Submit"})]})},T={args:{children:"Button"},parameters:{layout:"fullscreen"},render:()=>r.jsxs("div",{style:{padding:"2rem",display:"flex",flexDirection:"column",gap:"2rem"},children:[r.jsxs("section",{children:[r.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Variant × Size Matrix"}),r.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:t.map(n=>r.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:[r.jsx("span",{style:{width:"80px",fontSize:"12px",color:"var(--color-fg-muted)"},children:n}),w.map(a=>r.jsx(e,{variant:n,size:a,children:a},`${n}-${a}`))]},n))})]}),r.jsxs("section",{children:[r.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"States"}),r.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:[r.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:[r.jsx("span",{style:{width:"80px",fontSize:"12px",color:"var(--color-fg-muted)"},children:"default"}),t.map(n=>r.jsx(e,{variant:n,children:n},n))]}),r.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:[r.jsx("span",{style:{width:"80px",fontSize:"12px",color:"var(--color-fg-muted)"},children:"disabled"}),t.map(n=>r.jsx(e,{variant:n,disabled:!0,children:n},n))]}),r.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:[r.jsx("span",{style:{width:"80px",fontSize:"12px",color:"var(--color-fg-muted)"},children:"loading"}),t.map(n=>r.jsx(e,{variant:n,loading:!0,children:n},n))]})]})]}),r.jsxs("section",{children:[r.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Full Width"}),r.jsxs("div",{style:{maxWidth:"300px",display:"flex",flexDirection:"column",gap:"0.5rem"},children:[r.jsx(e,{variant:"primary",fullWidth:!0,children:"Primary Full Width"}),r.jsx(e,{variant:"secondary",fullWidth:!0,children:"Secondary Full Width"})]})]})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Button",
    variant: "secondary",
    size: "md"
  }
}`,...s.parameters?.docs?.source},description:{story:"默认状态：secondary variant, md size",...s.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Primary Button",
    variant: "primary",
    size: "md"
  }
}`,...i.parameters?.docs?.source},description:{story:"Primary variant：主要 CTA 按钮",...i.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Secondary Button",
    variant: "secondary",
    size: "md"
  }
}`,...o.parameters?.docs?.source},description:{story:"Secondary variant：次要操作按钮",...o.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Ghost Button",
    variant: "ghost",
    size: "md"
  }
}`,...d.parameters?.docs?.source},description:{story:"Ghost variant：轻量级操作按钮",...d.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Danger Button",
    variant: "danger",
    size: "md"
  }
}`,...c.parameters?.docs?.source},description:{story:"Danger variant：危险/删除操作按钮",...c.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Small Button",
    variant: "secondary",
    size: "sm"
  }
}`,...l.parameters?.docs?.source},description:{story:"Small size：小尺寸按钮（28px 高）",...l.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Medium Button",
    variant: "secondary",
    size: "md"
  }
}`,...p.parameters?.docs?.source},description:{story:"Medium size：中等尺寸按钮（36px 高）",...p.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Large Button",
    variant: "secondary",
    size: "lg"
  }
}`,...m.parameters?.docs?.source},description:{story:"Large size：大尺寸按钮（44px 高）",...m.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Loading...",
    variant: "primary",
    size: "md",
    loading: true
  }
}`,...u.parameters?.docs?.source},description:{story:"Loading state：加载状态",...u.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Disabled Button",
    variant: "secondary",
    size: "md",
    disabled: true
  }
}`,...g.parameters?.docs?.source},description:{story:"Disabled state：禁用状态",...g.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Full Width Button",
    variant: "primary",
    size: "md",
    fullWidth: true
  },
  parameters: {
    layout: "padded"
  }
}`,...y.parameters?.docs?.source},description:{story:"Full width：全宽按钮",...y.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Button"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap"
  }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
}`,...v.parameters?.docs?.source},description:{story:"所有 Variants 展示",...v.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Button"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem",
    alignItems: "center"
  }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
}`,...h.parameters?.docs?.source},description:{story:"所有 Sizes 展示",...h.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Button"
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
        gap: "1rem",
        alignItems: "center"
      }}>
            {sizes.map(size => <Button key={\`\${variant}-\${size}\`} variant={variant} size={size}>
                {size.toUpperCase()}
              </Button>)}
          </div>
        </div>)}
    </div>
}`,...x.parameters?.docs?.source},description:{story:`完整 Variant × Size 矩阵

展示所有 4 种 variant 和 3 种 size 的组合（共 12 种）`,...x.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Button"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap"
  }}>
      {variants.map(variant => <Button key={variant} variant={variant} disabled>
          {variant} (disabled)
        </Button>)}
    </div>
}`,...f.parameters?.docs?.source},description:{story:`所有 Disabled 状态矩阵

展示所有 variant 的 disabled 状态`,...f.parameters?.docs?.description}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Button"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap"
  }}>
      {variants.map(variant => <Button key={variant} variant={variant} loading>
          {variant}
        </Button>)}
    </div>
}`,...B.parameters?.docs?.source},description:{story:`所有 Loading 状态矩阵

展示所有 variant 的 loading 状态`,...B.parameters?.docs?.description}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    children: "This is a very long button text that might overflow in some containers",
    variant: "secondary",
    size: "md"
  }
}`,...S.parameters?.docs?.source},description:{story:`超长文本

验证文本过长时的处理（当前实现：不截断，依赖容器控制）`,...S.parameters?.docs?.description}}};z.parameters={...z.parameters,docs:{...z.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Button"
  },
  parameters: {
    layout: "padded"
  },
  render: () => <div style={{
    width: "150px",
    border: "1px dashed var(--color-border-default)"
  }}>
      <Button fullWidth>
        Very Long Button Text That Should Handle Overflow
      </Button>
    </div>
}`,...z.parameters?.docs?.source},description:{story:`超长文本（在有限宽度容器中）

验证文本过长时不会撑破布局`,...z.parameters?.docs?.description}}};j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    children: "OK",
    variant: "primary",
    size: "sm"
  }
}`,...j.parameters?.docs?.source},description:{story:`短文本

验证短文本时按钮仍然保持可用的最小宽度`,...j.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    children: "X",
    variant: "danger",
    size: "sm"
  }
}`,...b.parameters?.docs?.source},description:{story:`单字符

验证单字符时按钮仍然保持可用尺寸`,...b.parameters?.docs?.description}}};D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Button"
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem"
  }}>
      <Button variant="primary">🚀 Launch</Button>
      <Button variant="secondary">💾 Save</Button>
      <Button variant="danger">🗑️ Delete</Button>
    </div>
}`,...D.parameters?.docs?.source},description:{story:`带 Emoji 的按钮

验证 emoji 与文本混排时对齐正确`,...D.parameters?.docs?.description}}};W.parameters={...W.parameters,docs:{...W.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Button"
  },
  parameters: {
    docs: {
      description: {
        story: "使用 Tab 键聚焦到按钮，验证 focus ring 是否正确显示"
      }
    }
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem",
    alignItems: "center"
  }}>
      <span style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)"
    }}>
        Tab →
      </span>
      <Button variant="primary">Primary Focus</Button>
      <Button variant="secondary">Secondary Focus</Button>
      <Button variant="ghost">Ghost Focus</Button>
      <Button variant="danger">Danger Focus</Button>
    </div>
}`,...W.parameters?.docs?.source},description:{story:`Focus 状态测试

使用 Tab 键导航到按钮，验证 focus-visible 样式
- 应显示 focus ring（outline）
- 颜色为 --color-ring-focus`,...W.parameters?.docs?.description}}};F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Button"
  },
  render: () => <div style={{
    display: "flex",
    gap: "0.5rem"
  }}>
      <Button variant="secondary">Cancel</Button>
      <Button variant="primary">Submit</Button>
    </div>
}`,...F.parameters?.docs?.source},description:{story:`按钮组（验证间距）

多个按钮并排时的间距验证`,...F.parameters?.docs?.description}}};T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Button"
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
      {/* Variant × Size */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Variant × Size Matrix
        </h3>
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}>
          {variants.map(variant => <div key={variant} style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center"
        }}>
              <span style={{
            width: "80px",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
                {variant}
              </span>
              {sizes.map(size => <Button key={\`\${variant}-\${size}\`} variant={variant} size={size}>
                  {size}
                </Button>)}
            </div>)}
        </div>
      </section>

      {/* States */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          States
        </h3>
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}>
          <div style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center"
        }}>
            <span style={{
            width: "80px",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              default
            </span>
            {variants.map(variant => <Button key={variant} variant={variant}>
                {variant}
              </Button>)}
          </div>
          <div style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center"
        }}>
            <span style={{
            width: "80px",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              disabled
            </span>
            {variants.map(variant => <Button key={variant} variant={variant} disabled>
                {variant}
              </Button>)}
          </div>
          <div style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center"
        }}>
            <span style={{
            width: "80px",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              loading
            </span>
            {variants.map(variant => <Button key={variant} variant={variant} loading>
                {variant}
              </Button>)}
          </div>
        </div>
      </section>

      {/* Full Width */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Full Width
        </h3>
        <div style={{
        maxWidth: "300px",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem"
      }}>
          <Button variant="primary" fullWidth>
            Primary Full Width
          </Button>
          <Button variant="secondary" fullWidth>
            Secondary Full Width
          </Button>
        </div>
      </section>
    </div>
}`,...T.parameters?.docs?.source},description:{story:`完整状态展示（用于 AI 自检）

包含所有 variant、size、state 的完整矩阵，便于一次性检查`,...T.parameters?.docs?.description}}};const V=["Default","Primary","Secondary","Ghost","Danger","Small","Medium","Large","Loading","Disabled","FullWidth","AllVariants","AllSizes","VariantSizeMatrix","DisabledMatrix","LoadingMatrix","LongText","LongTextConstrained","ShortText","SingleChar","WithEmoji","FocusTest","ButtonGroup","FullMatrix"];export{h as AllSizes,v as AllVariants,F as ButtonGroup,c as Danger,s as Default,g as Disabled,f as DisabledMatrix,W as FocusTest,T as FullMatrix,y as FullWidth,d as Ghost,m as Large,u as Loading,B as LoadingMatrix,S as LongText,z as LongTextConstrained,p as Medium,i as Primary,o as Secondary,j as ShortText,b as SingleChar,l as Small,x as VariantSizeMatrix,D as WithEmoji,V as __namedExportsOrder,P as default};
