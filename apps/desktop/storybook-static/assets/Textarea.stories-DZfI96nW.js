import{j as e}from"./jsx-runtime-BLchON5X.js";import{r as E}from"./index-DDi9LDaq.js";import{T as r}from"./Textarea-C3DI-yW7.js";import"./index-kA4PVysc.js";const F={title:"Primitives/Textarea",component:r,parameters:{layout:"centered",docs:{description:{component:`Textarea 组件 Story

设计规范 §6.2
多行文本输入框，支持 error 状态和 fullWidth 模式。

状态矩阵（MUST 全部实现）：
- default: 正常边框颜色
- focus: 边框高亮 + focus ring
- error: 红色边框
- disabled: opacity: 0.5，不可交互，不可 resize
- placeholder: 占位符文本`}}},tags:["autodocs"],argTypes:{placeholder:{control:"text",description:"Placeholder text"},error:{control:"boolean",description:"Show error state styling"},disabled:{control:"boolean",description:"Disable the textarea"},fullWidth:{control:"boolean",description:"Full width textarea"},rows:{control:"number",description:"Number of visible text rows"}}},o={args:{placeholder:"Enter text..."}},a={args:{defaultValue:`This is some pre-filled text content.

It can span multiple lines.`}},s={args:{placeholder:"Write your story here... Be creative!"}},i={args:{placeholder:"Enter text...",rows:8}},l={args:{placeholder:"Enter text...",error:!0,defaultValue:"Invalid content"}},d={args:{placeholder:"Cannot edit",disabled:!0,defaultValue:"This content is read-only"}},c={args:{placeholder:"Enter text...",fullWidth:!0},parameters:{layout:"padded"},decorators:[n=>e.jsx("div",{style:{width:"400px"},children:e.jsx(n,{})})]},p={args:{placeholder:"Error and disabled",error:!0,disabled:!0,defaultValue:"Invalid and read-only"}},m={args:{placeholder:"Type something..."},render:function(){const[t,j]=E.useState("");return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:[e.jsx(r,{placeholder:"Type something...",value:t,onChange:z=>j(z.target.value)}),e.jsxs("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:["Character count: ",t.length]})]})}},u={args:{placeholder:"Max 100 characters..."},render:function(){const[t,j]=E.useState(""),T=100-t.length,w=T<0;return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:[e.jsx(r,{placeholder:"Max 100 characters...",value:t,onChange:V=>j(V.target.value),error:w}),e.jsxs("span",{style:{fontSize:"12px",color:w?"var(--color-error)":"var(--color-fg-muted)"},children:[T," characters remaining"]})]})}},x={args:{placeholder:"Tab to focus"},parameters:{docs:{description:{story:"使用 Tab 键聚焦到 textarea，验证 focus ring 是否正确显示"}}},render:()=>e.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"flex-start"},children:[e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Tab →"}),e.jsx(r,{placeholder:"First textarea"}),e.jsx(r,{placeholder:"Second textarea"})]})},h={args:{},parameters:{layout:"padded"},render:()=>e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"auto 1fr 1fr",gap:"1.5rem",alignItems:"start"},children:[e.jsx("div",{}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)",textAlign:"center"},children:"Normal"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)",textAlign:"center"},children:"Error"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Enabled"}),e.jsx(r,{placeholder:"Enter text..."}),e.jsx(r,{placeholder:"Invalid input",error:!0}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Disabled"}),e.jsx(r,{placeholder:"Read only",disabled:!0}),e.jsx(r,{placeholder:"Error disabled",error:!0,disabled:!0}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"With Value"}),e.jsx(r,{defaultValue:"Some content here"}),e.jsx(r,{defaultValue:"Invalid content",error:!0})]})},g={args:{defaultValue:`This is a very long piece of content that spans multiple lines.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

This content should be scrollable within the textarea.`,rows:6}},v={args:{defaultValue:"Short single line",rows:2}},f={args:{placeholder:"Enter text...",fullWidth:!0},parameters:{layout:"padded"},decorators:[n=>e.jsx("div",{style:{width:"200px",border:"1px dashed var(--color-border-default)",padding:"1rem"},children:e.jsx(n,{})})]},y={args:{},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1.5rem"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Normal (resize-y enabled)"}),e.jsx(r,{placeholder:"Drag the bottom-right corner to resize",rows:4})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Disabled (resize disabled)"}),e.jsx(r,{placeholder:"Cannot resize when disabled",rows:4,disabled:!0})]})]})},S={args:{placeholder:"Minimum height textarea",rows:1}},b={args:{},parameters:{layout:"fullscreen"},render:()=>e.jsxs("div",{style:{padding:"2rem",display:"flex",flexDirection:"column",gap:"2rem"},children:[e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Basic States"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"1.5rem"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Default"}),e.jsx(r,{placeholder:"Enter text..."})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"With Value"}),e.jsx(r,{defaultValue:"Some content here"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Error"}),e.jsx(r,{placeholder:"Invalid input",error:!0})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Disabled"}),e.jsx(r,{placeholder:"Read only",disabled:!0})]})]})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Full Width"}),e.jsx("div",{style:{maxWidth:"400px"},children:e.jsx(r,{placeholder:"Full width textarea...",fullWidth:!0})})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Different Row Counts"}),e.jsxs("div",{style:{display:"flex",gap:"1.5rem",flexWrap:"wrap"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"2 rows"}),e.jsx(r,{placeholder:"2 rows",rows:2})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"4 rows (default)"}),e.jsx(r,{placeholder:"4 rows",rows:4})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"8 rows"}),e.jsx(r,{placeholder:"8 rows",rows:8})]})]})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"State Combinations"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:"1.5rem"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Error + Value"}),e.jsx(r,{defaultValue:"Invalid content here",error:!0})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Disabled + Value"}),e.jsx(r,{defaultValue:"Read-only content",disabled:!0})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Error + Disabled"}),e.jsx(r,{defaultValue:"Error and disabled",error:!0,disabled:!0})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Full Width + Error"}),e.jsx(r,{placeholder:"Full width error",error:!0,fullWidth:!0})]})]})]})]})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Enter text..."
  }
}`,...o.parameters?.docs?.source},description:{story:"默认状态",...o.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: "This is some pre-filled text content.\\n\\nIt can span multiple lines."
  }
}`,...a.parameters?.docs?.source},description:{story:"带初始值",...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Write your story here... Be creative!"
  }
}`,...s.parameters?.docs?.source},description:{story:"自定义 placeholder",...s.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Enter text...",
    rows: 8
  }
}`,...i.parameters?.docs?.source},description:{story:"自定义行数",...i.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Enter text...",
    error: true,
    defaultValue: "Invalid content"
  }
}`,...l.parameters?.docs?.source},description:{story:"Error 状态",...l.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Cannot edit",
    disabled: true,
    defaultValue: "This content is read-only"
  }
}`,...d.parameters?.docs?.source},description:{story:"Disabled 状态",...d.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Enter text...",
    fullWidth: true
  },
  parameters: {
    layout: "padded"
  },
  decorators: [Story => <div style={{
    width: "400px"
  }}>
        <Story />
      </div>]
}`,...c.parameters?.docs?.source},description:{story:"Full Width",...c.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Error and disabled",
    error: true,
    disabled: true,
    defaultValue: "Invalid and read-only"
  }
}`,...p.parameters?.docs?.source},description:{story:"Error + Disabled",...p.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Type something..."
  },
  render: function ControlledTextarea() {
    const [value, setValue] = useState("");
    return <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem"
    }}>
        <Textarea placeholder="Type something..." value={value} onChange={e => setValue(e.target.value)} />
        <span style={{
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Character count: {value.length}
        </span>
      </div>;
  }
}`,...m.parameters?.docs?.source},description:{story:"Controlled：受控模式演示",...m.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Max 100 characters..."
  },
  render: function CharacterLimitTextarea() {
    const [value, setValue] = useState("");
    const maxLength = 100;
    const remaining = maxLength - value.length;
    const isOverLimit = remaining < 0;
    return <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem"
    }}>
        <Textarea placeholder="Max 100 characters..." value={value} onChange={e => setValue(e.target.value)} error={isOverLimit} />
        <span style={{
        fontSize: "12px",
        color: isOverLimit ? "var(--color-error)" : "var(--color-fg-muted)"
      }}>
          {remaining} characters remaining
        </span>
      </div>;
  }
}`,...u.parameters?.docs?.source},description:{story:"带字符限制的 Textarea",...u.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Tab to focus"
  },
  parameters: {
    docs: {
      description: {
        story: "使用 Tab 键聚焦到 textarea，验证 focus ring 是否正确显示"
      }
    }
  },
  render: () => <div style={{
    display: "flex",
    gap: "1rem",
    alignItems: "flex-start"
  }}>
      <span style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)"
    }}>
        Tab →
      </span>
      <Textarea placeholder="First textarea" />
      <Textarea placeholder="Second textarea" />
    </div>
}`,...x.parameters?.docs?.source},description:{story:`Focus 状态测试

使用 Tab 键导航，验证 focus-visible 样式`,...x.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {},
  parameters: {
    layout: "padded"
  },
  render: () => <div style={{
    display: "grid",
    gridTemplateColumns: "auto 1fr 1fr",
    gap: "1.5rem",
    alignItems: "start"
  }}>
      {/* Headers */}
      <div />
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)",
      textAlign: "center"
    }}>
        Normal
      </div>
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)",
      textAlign: "center"
    }}>
        Error
      </div>

      {/* Enabled row */}
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)"
    }}>
        Enabled
      </div>
      <Textarea placeholder="Enter text..." />
      <Textarea placeholder="Invalid input" error />

      {/* Disabled row */}
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)"
    }}>
        Disabled
      </div>
      <Textarea placeholder="Read only" disabled />
      <Textarea placeholder="Error disabled" error disabled />

      {/* With Value row */}
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)"
    }}>
        With Value
      </div>
      <Textarea defaultValue="Some content here" />
      <Textarea defaultValue="Invalid content" error />
    </div>
}`,...h.parameters?.docs?.source},description:{story:`完整状态矩阵

展示所有状态组合：error × disabled`,...h.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: \`This is a very long piece of content that spans multiple lines.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

This content should be scrollable within the textarea.\`,
    rows: 6
  }
}`,...g.parameters?.docs?.source},description:{story:"超长内容",...g.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: "Short single line",
    rows: 2
  }
}`,...v.parameters?.docs?.source},description:{story:"单行内容",...v.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Enter text...",
    fullWidth: true
  },
  parameters: {
    layout: "padded"
  },
  decorators: [Story => <div style={{
    width: "200px",
    border: "1px dashed var(--color-border-default)",
    padding: "1rem"
  }}>
        <Story />
      </div>]
}`,...f.parameters?.docs?.source},description:{story:"宽度受限容器",...f.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {},
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem"
  }}>
      <div>
        <div style={{
        marginBottom: "0.5rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Normal (resize-y enabled)
        </div>
        <Textarea placeholder="Drag the bottom-right corner to resize" rows={4} />
      </div>
      <div>
        <div style={{
        marginBottom: "0.5rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Disabled (resize disabled)
        </div>
        <Textarea placeholder="Cannot resize when disabled" rows={4} disabled />
      </div>
    </div>
}`,...y.parameters?.docs?.source},description:{story:"Resize 行为测试",...y.parameters?.docs?.description}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Minimum height textarea",
    rows: 1
  }
}`,...S.parameters?.docs?.source},description:{story:"最小高度测试",...S.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {},
  parameters: {
    layout: "fullscreen"
  },
  render: () => <div style={{
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem"
  }}>
      {/* Basic States */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Basic States
        </h3>
        <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1.5rem"
      }}>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              Default
            </div>
            <Textarea placeholder="Enter text..." />
          </div>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              With Value
            </div>
            <Textarea defaultValue="Some content here" />
          </div>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              Error
            </div>
            <Textarea placeholder="Invalid input" error />
          </div>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              Disabled
            </div>
            <Textarea placeholder="Read only" disabled />
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
        maxWidth: "400px"
      }}>
          <Textarea placeholder="Full width textarea..." fullWidth />
        </div>
      </section>

      {/* Rows Variation */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Different Row Counts
        </h3>
        <div style={{
        display: "flex",
        gap: "1.5rem",
        flexWrap: "wrap"
      }}>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              2 rows
            </div>
            <Textarea placeholder="2 rows" rows={2} />
          </div>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              4 rows (default)
            </div>
            <Textarea placeholder="4 rows" rows={4} />
          </div>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              8 rows
            </div>
            <Textarea placeholder="8 rows" rows={8} />
          </div>
        </div>
      </section>

      {/* State Combinations */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          State Combinations
        </h3>
        <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1.5rem"
      }}>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              Error + Value
            </div>
            <Textarea defaultValue="Invalid content here" error />
          </div>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              Disabled + Value
            </div>
            <Textarea defaultValue="Read-only content" disabled />
          </div>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              Error + Disabled
            </div>
            <Textarea defaultValue="Error and disabled" error disabled />
          </div>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              Full Width + Error
            </div>
            <Textarea placeholder="Full width error" error fullWidth />
          </div>
        </div>
      </section>
    </div>
}`,...b.parameters?.docs?.source},description:{story:`完整展示（用于 AI 自检）

包含所有状态的完整矩阵，便于一次性检查`,...b.parameters?.docs?.description}}};const I=["Default","WithValue","CustomPlaceholder","CustomRows","Error","Disabled","FullWidth","ErrorDisabled","Controlled","WithCharacterLimit","FocusTest","StateMatrix","LongContent","SingleLine","ConstrainedWidth","ResizeBehavior","MinHeight","FullMatrix"];export{f as ConstrainedWidth,m as Controlled,s as CustomPlaceholder,i as CustomRows,o as Default,d as Disabled,l as Error,p as ErrorDisabled,x as FocusTest,b as FullMatrix,c as FullWidth,g as LongContent,S as MinHeight,y as ResizeBehavior,v as SingleLine,h as StateMatrix,u as WithCharacterLimit,a as WithValue,I as __namedExportsOrder,F as default};
