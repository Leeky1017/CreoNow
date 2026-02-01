import{j as e}from"./jsx-runtime-BLchON5X.js";import{r as j}from"./index-DDi9LDaq.js";import{C as n}from"./Checkbox-Ddw3urWg.js";import"./index-kA4PVysc.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-Tf3TKiO9.js";import"./index-CEv_TvBl.js";import"./index-nu25GvvV.js";const O={title:"Primitives/Checkbox",component:n,parameters:{layout:"centered",docs:{description:{component:`Checkbox 组件 Story

设计规范 §6.2
基于 Radix UI Checkbox 的复选框组件。
支持 checked、unchecked、indeterminate 三种状态。

状态矩阵（MUST 全部实现）：
- unchecked: 默认空白状态
- checked: 显示勾选图标
- indeterminate: 显示横线图标（用于全选场景）
- hover: 边框高亮
- focus-visible: 显示 focus ring（Tab 键聚焦）
- disabled: opacity: 0.5，不可交互`}}},tags:["autodocs"],argTypes:{label:{control:"text",description:"Optional label text displayed next to the checkbox"},checked:{control:"select",options:[!0,!1,"indeterminate"],description:"Controlled checked state"},disabled:{control:"boolean",description:"Disable the checkbox"}}},a={args:{}},l={args:{label:"Accept terms and conditions"}},o={args:{checked:!0,label:"Selected option"}},c={args:{checked:!1,label:"Unselected option"}},d={args:{checked:"indeterminate",label:"Partially selected"}},i={args:{disabled:!0,label:"Disabled unchecked"}},m={args:{disabled:!0,checked:!0,label:"Disabled checked"}},p={args:{disabled:!0,checked:"indeterminate",label:"Disabled indeterminate"}},h={args:{label:"Toggle me"},render:function(){const[t,s]=j.useState(!1);return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:[e.jsx(n,{label:"Toggle this checkbox",checked:t,onCheckedChange:S=>s(S===!0)}),e.jsxs("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:["Current state: ",t?"checked":"unchecked"]})]})}},u={args:{},render:function(){const[t,s]=j.useState([!1,!0,!1]),S=t.every(Boolean),I=t.some(Boolean),L=S?!0:I?"indeterminate":!1,z=r=>{s(r===!0?[!0,!0,!0]:[!1,!1,!1])},T=(r,v)=>{const C=[...t];C[r]=v,s(C)};return e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.75rem"},children:[e.jsx(n,{label:"Select All",checked:L,onCheckedChange:z}),e.jsx("div",{style:{marginLeft:"1.5rem",display:"flex",flexDirection:"column",gap:"0.5rem"},children:["Item 1","Item 2","Item 3"].map((r,v)=>e.jsx(n,{label:r,checked:t[v],onCheckedChange:C=>T(v,C===!0)},r))})]})}},b={args:{},parameters:{docs:{description:{story:"使用 Tab 键聚焦到 checkbox，验证 focus ring 是否正确显示"}}},render:()=>e.jsxs("div",{style:{display:"flex",gap:"2rem",alignItems:"center"},children:[e.jsx("span",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Tab →"}),e.jsx(n,{label:"First"}),e.jsx(n,{label:"Second"}),e.jsx(n,{label:"Third"})]})},x={args:{},parameters:{layout:"padded"},render:()=>e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"auto auto auto auto",gap:"1.5rem",alignItems:"center"},children:[e.jsx("div",{}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)",textAlign:"center"},children:"Unchecked"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)",textAlign:"center"},children:"Checked"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)",textAlign:"center"},children:"Indeterminate"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Normal"}),e.jsx(n,{}),e.jsx(n,{checked:!0}),e.jsx(n,{checked:"indeterminate"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Disabled"}),e.jsx(n,{disabled:!0}),e.jsx(n,{disabled:!0,checked:!0}),e.jsx(n,{disabled:!0,checked:"indeterminate"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"With Label"}),e.jsx(n,{label:"Label"}),e.jsx(n,{label:"Label",checked:!0}),e.jsx(n,{label:"Label",checked:"indeterminate"}),e.jsx("div",{style:{fontSize:"12px",color:"var(--color-fg-muted)"},children:"Disabled + Label"}),e.jsx(n,{disabled:!0,label:"Label"}),e.jsx(n,{disabled:!0,label:"Label",checked:!0}),e.jsx(n,{disabled:!0,label:"Label",checked:"indeterminate"})]})},g={args:{label:"This is a very long label text that might wrap to multiple lines in some containers and should still align properly with the checkbox"}},k={args:{},parameters:{layout:"padded"},render:()=>e.jsx("div",{style:{width:"200px",border:"1px dashed var(--color-border-default)",padding:"1rem"},children:e.jsx(n,{label:"This is a very long label text that should wrap nicely within this constrained container"})})},f={args:{},render:()=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"0.5rem"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"},children:[e.jsx(n,{}),e.jsx("span",{style:{fontSize:"13px"},children:"Custom content 1"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"},children:[e.jsx(n,{checked:!0}),e.jsx("span",{style:{fontSize:"13px"},children:"Custom content 2"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem"},children:[e.jsx(n,{}),e.jsx("span",{style:{fontSize:"13px"},children:"Custom content 3"})]})]})},y={args:{},parameters:{layout:"fullscreen"},render:()=>e.jsxs("div",{style:{padding:"2rem",display:"flex",flexDirection:"column",gap:"2rem"},children:[e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"States"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(3, auto)",gap:"1.5rem"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Unchecked"}),e.jsx(n,{label:"Unchecked"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Checked"}),e.jsx(n,{label:"Checked",checked:!0})]}),e.jsxs("div",{children:[e.jsx("div",{style:{marginBottom:"0.5rem",fontSize:"12px",color:"var(--color-fg-muted)"},children:"Indeterminate"}),e.jsx(n,{label:"Indeterminate",checked:"indeterminate"})]})]})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Disabled States"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(3, auto)",gap:"1.5rem"},children:[e.jsx(n,{disabled:!0,label:"Disabled unchecked"}),e.jsx(n,{disabled:!0,label:"Disabled checked",checked:!0}),e.jsx(n,{disabled:!0,label:"Disabled indeterminate",checked:"indeterminate"})]})]}),e.jsxs("section",{children:[e.jsx("h3",{style:{margin:"0 0 1rem",fontSize:"14px",color:"var(--color-fg-default)"},children:"Without Label"}),e.jsxs("div",{style:{display:"flex",gap:"1.5rem"},children:[e.jsx(n,{}),e.jsx(n,{checked:!0}),e.jsx(n,{checked:"indeterminate"}),e.jsx(n,{disabled:!0}),e.jsx(n,{disabled:!0,checked:!0})]})]})]})};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {}
}`,...a.parameters?.docs?.source},description:{story:"默认状态：未选中",...a.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Accept terms and conditions"
  }
}`,...l.parameters?.docs?.source},description:{story:"带 label 的 Checkbox",...l.parameters?.docs?.description}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    checked: true,
    label: "Selected option"
  }
}`,...o.parameters?.docs?.source},description:{story:"已选中状态",...o.parameters?.docs?.description}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    checked: false,
    label: "Unselected option"
  }
}`,...c.parameters?.docs?.source},description:{story:"未选中状态",...c.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    checked: "indeterminate",
    label: "Partially selected"
  }
}`,...d.parameters?.docs?.source},description:{story:"Indeterminate 状态（部分选中）",...d.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    label: "Disabled unchecked"
  }
}`,...i.parameters?.docs?.source},description:{story:"Disabled 状态：未选中",...i.parameters?.docs?.description}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    checked: true,
    label: "Disabled checked"
  }
}`,...m.parameters?.docs?.source},description:{story:"Disabled 状态：已选中",...m.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    checked: "indeterminate",
    label: "Disabled indeterminate"
  }
}`,...p.parameters?.docs?.source},description:{story:"Disabled 状态：indeterminate",...p.parameters?.docs?.description}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Toggle me"
  },
  render: function ControlledCheckbox() {
    const [checked, setChecked] = useState(false);
    return <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem"
    }}>
        <Checkbox label="Toggle this checkbox" checked={checked} onCheckedChange={value => setChecked(value === true)} />
        <span style={{
        fontSize: "12px",
        color: "var(--color-fg-muted)"
      }}>
          Current state: {checked ? "checked" : "unchecked"}
        </span>
      </div>;
  }
}`,...h.parameters?.docs?.source},description:{story:"Controlled：受控模式演示",...h.parameters?.docs?.description}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {},
  render: function SelectAllDemoComponent() {
    const [items, setItems] = useState([false, true, false]);
    const allSelected = items.every(Boolean);
    const someSelected = items.some(Boolean);
    const selectAllState = allSelected ? true : someSelected ? "indeterminate" : false;
    const handleSelectAll = (checked: boolean | "indeterminate") => {
      if (checked === true) {
        setItems([true, true, true]);
      } else {
        setItems([false, false, false]);
      }
    };
    const handleItemChange = (index: number, checked: boolean) => {
      const newItems = [...items];
      newItems[index] = checked;
      setItems(newItems);
    };
    return <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem"
    }}>
        <Checkbox label="Select All" checked={selectAllState} onCheckedChange={handleSelectAll} />
        <div style={{
        marginLeft: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem"
      }}>
          {["Item 1", "Item 2", "Item 3"].map((item, index) => <Checkbox key={item} label={item} checked={items[index]} onCheckedChange={checked => handleItemChange(index, checked === true)} />)}
        </div>
      </div>;
  }
}`,...u.parameters?.docs?.source},description:{story:"Select All 模式：演示 indeterminate 使用场景",...u.parameters?.docs?.description}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {},
  parameters: {
    docs: {
      description: {
        story: "使用 Tab 键聚焦到 checkbox，验证 focus ring 是否正确显示"
      }
    }
  },
  render: () => <div style={{
    display: "flex",
    gap: "2rem",
    alignItems: "center"
  }}>
      <span style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)"
    }}>
        Tab →
      </span>
      <Checkbox label="First" />
      <Checkbox label="Second" />
      <Checkbox label="Third" />
    </div>
}`,...b.parameters?.docs?.source},description:{story:`Focus 状态测试

使用 Tab 键导航，验证 focus-visible 样式`,...b.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {},
  parameters: {
    layout: "padded"
  },
  render: () => <div style={{
    display: "grid",
    gridTemplateColumns: "auto auto auto auto",
    gap: "1.5rem",
    alignItems: "center"
  }}>
      {/* Headers */}
      <div />
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)",
      textAlign: "center"
    }}>
        Unchecked
      </div>
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)",
      textAlign: "center"
    }}>
        Checked
      </div>
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)",
      textAlign: "center"
    }}>
        Indeterminate
      </div>

      {/* Normal row */}
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)"
    }}>
        Normal
      </div>
      <Checkbox />
      <Checkbox checked={true} />
      <Checkbox checked="indeterminate" />

      {/* Disabled row */}
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)"
    }}>
        Disabled
      </div>
      <Checkbox disabled />
      <Checkbox disabled checked={true} />
      <Checkbox disabled checked="indeterminate" />

      {/* With Label row */}
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)"
    }}>
        With Label
      </div>
      <Checkbox label="Label" />
      <Checkbox label="Label" checked={true} />
      <Checkbox label="Label" checked="indeterminate" />

      {/* Disabled with Label row */}
      <div style={{
      fontSize: "12px",
      color: "var(--color-fg-muted)"
    }}>
        Disabled + Label
      </div>
      <Checkbox disabled label="Label" />
      <Checkbox disabled label="Label" checked={true} />
      <Checkbox disabled label="Label" checked="indeterminate" />
    </div>
}`,...x.parameters?.docs?.source},description:{story:`完整状态矩阵

展示所有状态组合：checked × disabled`,...x.parameters?.docs?.description}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    label: "This is a very long label text that might wrap to multiple lines in some containers and should still align properly with the checkbox"
  }
}`,...g.parameters?.docs?.source},description:{story:"超长 label 文本",...g.parameters?.docs?.description}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {},
  parameters: {
    layout: "padded"
  },
  render: () => <div style={{
    width: "200px",
    border: "1px dashed var(--color-border-default)",
    padding: "1rem"
  }}>
      <Checkbox label="This is a very long label text that should wrap nicely within this constrained container" />
    </div>
}`,...k.parameters?.docs?.source},description:{story:"超长 label 在有限宽度容器中",...k.parameters?.docs?.description}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {},
  render: () => <div style={{
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  }}>
      <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    }}>
        <Checkbox />
        <span style={{
        fontSize: "13px"
      }}>Custom content 1</span>
      </div>
      <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    }}>
        <Checkbox checked={true} />
        <span style={{
        fontSize: "13px"
      }}>Custom content 2</span>
      </div>
      <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    }}>
        <Checkbox />
        <span style={{
        fontSize: "13px"
      }}>Custom content 3</span>
      </div>
    </div>
}`,...f.parameters?.docs?.source},description:{story:"无 label 的多个 Checkbox（列表场景）",...f.parameters?.docs?.description}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
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
      {/* States Section */}
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
        gridTemplateColumns: "repeat(3, auto)",
        gap: "1.5rem"
      }}>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              Unchecked
            </div>
            <Checkbox label="Unchecked" />
          </div>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              Checked
            </div>
            <Checkbox label="Checked" checked={true} />
          </div>
          <div>
            <div style={{
            marginBottom: "0.5rem",
            fontSize: "12px",
            color: "var(--color-fg-muted)"
          }}>
              Indeterminate
            </div>
            <Checkbox label="Indeterminate" checked="indeterminate" />
          </div>
        </div>
      </section>

      {/* Disabled Section */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Disabled States
        </h3>
        <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, auto)",
        gap: "1.5rem"
      }}>
          <Checkbox disabled label="Disabled unchecked" />
          <Checkbox disabled label="Disabled checked" checked={true} />
          <Checkbox disabled label="Disabled indeterminate" checked="indeterminate" />
        </div>
      </section>

      {/* Without Label Section */}
      <section>
        <h3 style={{
        margin: "0 0 1rem",
        fontSize: "14px",
        color: "var(--color-fg-default)"
      }}>
          Without Label
        </h3>
        <div style={{
        display: "flex",
        gap: "1.5rem"
      }}>
          <Checkbox />
          <Checkbox checked={true} />
          <Checkbox checked="indeterminate" />
          <Checkbox disabled />
          <Checkbox disabled checked={true} />
        </div>
      </section>
    </div>
}`,...y.parameters?.docs?.source},description:{story:`完整展示（用于 AI 自检）

包含所有状态的完整矩阵，便于一次性检查`,...y.parameters?.docs?.description}}};const R=["Default","WithLabel","Checked","Unchecked","Indeterminate","DisabledUnchecked","DisabledChecked","DisabledIndeterminate","Controlled","SelectAllDemo","FocusTest","StateMatrix","LongLabel","LongLabelConstrained","NoLabelList","FullMatrix"];export{o as Checked,h as Controlled,a as Default,m as DisabledChecked,p as DisabledIndeterminate,i as DisabledUnchecked,b as FocusTest,y as FullMatrix,d as Indeterminate,g as LongLabel,k as LongLabelConstrained,f as NoLabelList,u as SelectAllDemo,x as StateMatrix,c as Unchecked,l as WithLabel,R as __namedExportsOrder,O as default};
