import{j as e}from"./jsx-runtime-BLchON5X.js";import{I as r}from"./Input-BR80orUP.js";import"./index-kA4PVysc.js";import"./index-DDi9LDaq.js";const V={title:"Primitives/Input",component:r,parameters:{layout:"centered",docs:{description:{component:`Input 组件 Story

设计规范 §6.2
单行文本输入框，支持 error、disabled、readonly 等状态。

状态矩阵（MUST 全部实现）：
- default: 正常边框颜色
- hover: 边框颜色变化（需要交互触发）
- focus-visible: 边框颜色 + focus ring（聚焦触发）
- error: 红色边框
- disabled: opacity: 0.5，不可编辑
- readonly: 轻微区分背景，可聚焦但不可编辑`}}},tags:["autodocs"],argTypes:{error:{control:"boolean",description:"Show error state styling"},fullWidth:{control:"boolean",description:"Full width input"},disabled:{control:"boolean",description:"Disable the input"},readOnly:{control:"boolean",description:"Make input read-only"},placeholder:{control:"text",description:"Placeholder text"}}},l={args:{placeholder:"Enter text..."}},n={args:{defaultValue:"Hello World"}},o={args:{placeholder:"Type something here..."}},t={args:{error:!0,defaultValue:"Invalid input"}},a={args:{disabled:!0,defaultValue:"Disabled input"}},s={args:{readOnly:!0,defaultValue:"Read only input"}},d={args:{fullWidth:!0,placeholder:"Full width input"},parameters:{layout:"padded"}},i={args:{placeholder:"Input"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem",width:"300px"},children:[e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Default"}),e.jsx(r,{placeholder:"Enter text...",fullWidth:!0})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"With Value"}),e.jsx(r,{defaultValue:"Hello World",fullWidth:!0})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Error"}),e.jsx(r,{error:!0,defaultValue:"Invalid input",fullWidth:!0})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Disabled"}),e.jsx(r,{disabled:!0,defaultValue:"Disabled input",fullWidth:!0})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Read Only"}),e.jsx(r,{readOnly:!0,defaultValue:"Read only input",fullWidth:!0})]})]})},c={args:{type:"password",placeholder:"Enter password..."}},p={args:{type:"email",placeholder:"Enter email..."}},u={args:{type:"number",placeholder:"Enter number..."}},m={args:{type:"search",placeholder:"Search..."}},f={args:{placeholder:"Input"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem",width:"300px"},children:[e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Text"}),e.jsx(r,{type:"text",placeholder:"Text input",fullWidth:!0})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Password"}),e.jsx(r,{type:"password",placeholder:"Password input",fullWidth:!0})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Email"}),e.jsx(r,{type:"email",placeholder:"Email input",fullWidth:!0})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Number"}),e.jsx(r,{type:"number",placeholder:"Number input",fullWidth:!0})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Search"}),e.jsx(r,{type:"search",placeholder:"Search input",fullWidth:!0})]})]})},h={args:{defaultValue:"This is a very long text that should scroll horizontally when it exceeds the input width"}},y={args:{defaultValue:"Input"},parameters:{layout:"padded"},render:()=>e.jsx("div",{style:{width:"200px",border:"1px dashed var(--color-border-default)"},children:e.jsx(r,{fullWidth:!0,defaultValue:"Very long text that should handle overflow properly without breaking layout"})})},x={args:{defaultValue:"Hi"}},g={args:{defaultValue:"Hello 🌍 World 🚀"}},v={args:{placeholder:"Input"},parameters:{docs:{description:{story:"使用 Tab 键聚焦到输入框，验证 focus ring 是否正确显示"}}},render:()=>e.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center"},children:[e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Tab →"}),e.jsx(r,{placeholder:"Default Focus"}),e.jsx(r,{error:!0,placeholder:"Error Focus"})]})},b={args:{placeholder:"Input"},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem",width:"300px"},children:[e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"13px",color:"var(--color-fg-default)"},children:"用户名"}),e.jsx(r,{placeholder:"请输入用户名",fullWidth:!0})]}),e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"13px",color:"var(--color-fg-default)"},children:"密码"}),e.jsx(r,{type:"password",placeholder:"请输入密码",fullWidth:!0})]}),e.jsxs("div",{children:[e.jsxs("label",{style:{display:"block",marginBottom:"0.25rem",fontSize:"13px",color:"var(--color-fg-default)"},children:["邮箱 ",e.jsx("span",{style:{color:"var(--color-error)"},children:"*"})]}),e.jsx(r,{type:"email",error:!0,placeholder:"请输入有效邮箱",fullWidth:!0}),e.jsx("span",{style:{display:"block",marginTop:"0.25rem",fontSize:"12px",color:"var(--color-error)"},children:"请输入有效的邮箱地址"})]})]})},S={args:{placeholder:"Input"},parameters:{layout:"fullscreen"},render:()=>e.jsxs("div",{style:{padding:"2rem",display:"flex",flexDirection:"column",gap:"2rem"},children:[e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"States"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"100px 1fr",gap:"1rem",alignItems:"center",maxWidth:"400px"},children:[e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"default"}),e.jsx(r,{placeholder:"Default input",fullWidth:!0}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"with value"}),e.jsx(r,{defaultValue:"Hello World",fullWidth:!0}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"error"}),e.jsx(r,{error:!0,defaultValue:"Invalid",fullWidth:!0}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"disabled"}),e.jsx(r,{disabled:!0,defaultValue:"Disabled",fullWidth:!0}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"readonly"}),e.jsx(r,{readOnly:!0,defaultValue:"Read only",fullWidth:!0})]})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Input Types"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"100px 1fr",gap:"1rem",alignItems:"center",maxWidth:"400px"},children:[e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"text"}),e.jsx(r,{type:"text",placeholder:"Text",fullWidth:!0}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"password"}),e.jsx(r,{type:"password",placeholder:"Password",fullWidth:!0}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"email"}),e.jsx(r,{type:"email",placeholder:"Email",fullWidth:!0}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"number"}),e.jsx(r,{type:"number",placeholder:"Number",fullWidth:!0}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"search"}),e.jsx(r,{type:"search",placeholder:"Search",fullWidth:!0})]})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Edge Cases"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"100px 1fr",gap:"1rem",alignItems:"center",maxWidth:"400px"},children:[e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"long text"}),e.jsx(r,{defaultValue:"This is a very long text that should scroll horizontally",fullWidth:!0}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"short"}),e.jsx(r,{defaultValue:"Hi",fullWidth:!0}),e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"emoji"}),e.jsx(r,{defaultValue:"Hello 🌍 World 🚀",fullWidth:!0})]})]})]})};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Enter text..."
  }
}`,...l.parameters?.docs?.source},description:{story:"默认状态：标准输入框",...l.parameters?.docs?.description}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: "Hello World"
  }
}`,...n.parameters?.docs?.source},description:{story:"带默认值",...n.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Type something here..."
  }
}`,...o.parameters?.docs?.source},description:{story:"带 placeholder",...o.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    error: true,
    defaultValue: "Invalid input"
  }
}`,...t.parameters?.docs?.source},description:{story:"Error 状态：验证失败",...t.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    defaultValue: "Disabled input"
  }
}`,...a.parameters?.docs?.source},description:{story:"Disabled 状态：禁用输入",...a.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    readOnly: true,
    defaultValue: "Read only input"
  }
}`,...s.parameters?.docs?.source},description:{story:"ReadOnly 状态：只读输入",...s.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    fullWidth: true,
    placeholder: "Full width input"
  },
  parameters: {
    layout: "padded"
  }
}`,...d.parameters?.docs?.source},description:{story:"Full Width：全宽输入框",...d.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Input"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "300px"
  }}>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Default
        </label>
        <Input placeholder="Enter text..." fullWidth />
      </div>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          With Value
        </label>
        <Input defaultValue="Hello World" fullWidth />
      </div>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Error
        </label>
        <Input error defaultValue="Invalid input" fullWidth />
      </div>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Disabled
        </label>
        <Input disabled defaultValue="Disabled input" fullWidth />
      </div>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Read Only
        </label>
        <Input readOnly defaultValue="Read only input" fullWidth />
      </div>
    </div>
}`,...i.parameters?.docs?.source},description:{story:"所有状态展示",...i.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    type: "password",
    placeholder: "Enter password..."
  }
}`,...c.parameters?.docs?.source},description:{story:"Password 输入",...c.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    type: "email",
    placeholder: "Enter email..."
  }
}`,...p.parameters?.docs?.source},description:{story:"Email 输入",...p.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    type: "number",
    placeholder: "Enter number..."
  }
}`,...u.parameters?.docs?.source},description:{story:"Number 输入",...u.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    type: "search",
    placeholder: "Search..."
  }
}`,...m.parameters?.docs?.source},description:{story:"Search 输入",...m.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Input"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "300px"
  }}>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Text
        </label>
        <Input type="text" placeholder="Text input" fullWidth />
      </div>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Password
        </label>
        <Input type="password" placeholder="Password input" fullWidth />
      </div>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Email
        </label>
        <Input type="email" placeholder="Email input" fullWidth />
      </div>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Number
        </label>
        <Input type="number" placeholder="Number input" fullWidth />
      </div>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Search
        </label>
        <Input type="search" placeholder="Search input" fullWidth />
      </div>
    </div>
}`,...f.parameters?.docs?.source},description:{story:"所有输入类型",...f.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: "This is a very long text that should scroll horizontally when it exceeds the input width"
  }
}`,...h.parameters?.docs?.source},description:{story:`超长文本

验证超长输入时的水平滚动行为`,...h.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: "Input"
  },
  parameters: {
    layout: "padded"
  },
  render: () => <div style={{
    width: "200px",
    border: "1px dashed var(--color-border-default)"
  }}>
      <Input fullWidth defaultValue="Very long text that should handle overflow properly without breaking layout" />
    </div>
}`,...y.parameters?.docs?.source},description:{story:`超长文本（在有限宽度容器中）

验证文本过长时不会撑破布局`,...y.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: "Hi"
  }
}`,...x.parameters?.docs?.source},description:{story:`短文本

验证短文本时输入框仍保持正常宽度`,...x.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: "Hello 🌍 World 🚀"
  }
}`,...g.parameters?.docs?.source},description:{story:`带 Emoji 的输入

验证 emoji 正确显示`,...g.parameters?.docs?.description}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Input"
  },
  parameters: {
    docs: {
      description: {
        story: "使用 Tab 键聚焦到输入框，验证 focus ring 是否正确显示"
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
    }}>Tab →</span>
      <Input placeholder="Default Focus" />
      <Input error placeholder="Error Focus" />
    </div>
}`,...v.parameters?.docs?.source},description:{story:`Focus 状态测试

使用 Tab 键导航到输入框，验证 focus-visible 样式
- 应显示 focus ring（outline）
- 边框颜色变化`,...v.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Input"
  },
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    width: "300px"
  }}>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "13px",
        color: "var(--color-fg-default)"
      }}>
          用户名
        </label>
        <Input placeholder="请输入用户名" fullWidth />
      </div>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "13px",
        color: "var(--color-fg-default)"
      }}>
          密码
        </label>
        <Input type="password" placeholder="请输入密码" fullWidth />
      </div>
      <div>
        <label style={{
        display: "block",
        marginBottom: "0.25rem",
        fontSize: "13px",
        color: "var(--color-fg-default)"
      }}>
          邮箱 <span style={{
          color: "var(--color-error)"
        }}>*</span>
        </label>
        <Input type="email" error placeholder="请输入有效邮箱" fullWidth />
        <span style={{
        display: "block",
        marginTop: "0.25rem",
        fontSize: "12px",
        color: "var(--color-error)"
      }}>
          请输入有效的邮箱地址
        </span>
      </div>
    </div>
}`,...b.parameters?.docs?.source},description:{story:`表单场景

模拟真实表单中的输入框使用`,...b.parameters?.docs?.description}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Input"
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
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          States
        </h3>
        <div style={{
        display: "grid",
        gridTemplateColumns: "100px 1fr",
        gap: "1rem",
        alignItems: "center",
        maxWidth: "400px"
      }}>
          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>default</span>
          <Input placeholder="Default input" fullWidth />

          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>with value</span>
          <Input defaultValue="Hello World" fullWidth />

          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>error</span>
          <Input error defaultValue="Invalid" fullWidth />

          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>disabled</span>
          <Input disabled defaultValue="Disabled" fullWidth />

          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>readonly</span>
          <Input readOnly defaultValue="Read only" fullWidth />
        </div>
      </section>

      {/* Input Types */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Input Types
        </h3>
        <div style={{
        display: "grid",
        gridTemplateColumns: "100px 1fr",
        gap: "1rem",
        alignItems: "center",
        maxWidth: "400px"
      }}>
          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>text</span>
          <Input type="text" placeholder="Text" fullWidth />

          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>password</span>
          <Input type="password" placeholder="Password" fullWidth />

          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>email</span>
          <Input type="email" placeholder="Email" fullWidth />

          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>number</span>
          <Input type="number" placeholder="Number" fullWidth />

          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>search</span>
          <Input type="search" placeholder="Search" fullWidth />
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
        display: "grid",
        gridTemplateColumns: "100px 1fr",
        gap: "1rem",
        alignItems: "center",
        maxWidth: "400px"
      }}>
          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>long text</span>
          <Input defaultValue="This is a very long text that should scroll horizontally" fullWidth />

          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>short</span>
          <Input defaultValue="Hi" fullWidth />

          <span style={{
          fontSize: "12px",
          color: "var(--color-fg-muted)"
        }}>emoji</span>
          <Input defaultValue="Hello 🌍 World 🚀" fullWidth />
        </div>
      </section>
    </div>
}`,...S.parameters?.docs?.source},description:{story:`完整状态展示（用于 AI 自检）

包含所有状态的完整矩阵，便于一次性检查`,...S.parameters?.docs?.description}}};const w=["Default","WithValue","WithPlaceholder","Error","Disabled","ReadOnly","FullWidth","AllStates","Password","Email","Number","Search","AllTypes","LongText","LongTextConstrained","ShortText","WithEmoji","FocusTest","FormScenario","FullMatrix"];export{i as AllStates,f as AllTypes,l as Default,a as Disabled,p as Email,t as Error,v as FocusTest,b as FormScenario,S as FullMatrix,d as FullWidth,h as LongText,y as LongTextConstrained,u as Number,c as Password,s as ReadOnly,m as Search,x as ShortText,g as WithEmoji,o as WithPlaceholder,n as WithValue,w as __namedExportsOrder,V as default};
