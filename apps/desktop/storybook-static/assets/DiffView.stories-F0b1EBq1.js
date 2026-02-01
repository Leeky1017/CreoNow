import{j as r}from"./jsx-runtime-BLchON5X.js";import{D as n}from"./DiffView-B8aluX7v.js";import"./index-kA4PVysc.js";import"./Button-B9XLIlTV.js";import"./Input-BR80orUP.js";import"./index-DDi9LDaq.js";import"./Textarea-C3DI-yW7.js";import"./Card-D2dqmnxE.js";import"./ListItem-CyD6nTsv.js";import"./Text-CW-Kyc9R.js";import"./Heading-BzOyC2Oj.js";import"./Dialog-DJV5UiAm.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-Dx0N0K8E.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-c9SlT_P8.js";import"./index-nu25GvvV.js";import"./Popover-BMinsKFS.js";import"./index-wwK3GREC.js";import"./index-CEv_TvBl.js";import"./Select-DBTPtHXT.js";import"./index-D6SgtPiA.js";import"./index-CAq0tSys.js";import"./index-Tf3TKiO9.js";import"./index-BEZKqDeb.js";import"./Checkbox-Ddw3urWg.js";import"./Tabs-DmRrGnuH.js";import"./index-CDK04lop.js";import"./Badge-0PIbcpDO.js";import"./Avatar-CFHo7YSR.js";import"./Spinner-BG3j59Um.js";import"./Skeleton-CwzwMFJo.js";import"./Tooltip-Ca9CUhYJ.js";import"./Toast-HPSiDIc2.js";import"./Accordion-F8I8yqG1.js";import"./Radio-DYZtN_dz.js";const Y={title:"Features/DiffView",component:n,parameters:{layout:"padded",docs:{description:{component:`DiffView 组件 Story

功能：
- 显示统一 diff 文本
- 代码样式渲染`}}},tags:["autodocs"],argTypes:{diffText:{control:"text",description:"Unified diff text to display"}}},c=`--- a/file.txt
+++ b/file.txt
@@ -1,5 +1,5 @@
 Line 1
-Line 2 (old)
+Line 2 (new)
 Line 3
 Line 4
 Line 5`,f=`--- a/document.md
+++ b/document.md
@@ -1,15 +1,15 @@
 # Document Title
 
-This is the old introduction paragraph.
+This is the new introduction paragraph with improvements.
 
 ## Section 1
 
-Content of section 1.
+Updated content of section 1 with more details.
 
 ## Section 2
 
-Old section 2 content.
+New section 2 content that is much better.
 
 ## Conclusion
 
-Old conclusion.
+New and improved conclusion.`,o={args:{diffText:c},render:e=>r.jsx("div",{style:{width:"400px",backgroundColor:"var(--color-bg-surface)",padding:"16px"},children:r.jsx(n,{...e})})},i={args:{diffText:""},render:e=>r.jsx("div",{style:{width:"400px",backgroundColor:"var(--color-bg-surface)",padding:"16px"},children:r.jsx(n,{...e})})},t={args:{diffText:f},render:e=>r.jsx("div",{style:{width:"500px",backgroundColor:"var(--color-bg-surface)",padding:"16px"},children:r.jsx(n,{...e})})},s={args:{diffText:c},render:e=>r.jsx("div",{style:{width:"280px",backgroundColor:"var(--color-bg-surface)",padding:"16px"},children:r.jsx(n,{...e})})},d={args:{diffText:f},render:e=>r.jsx("div",{style:{width:"800px",backgroundColor:"var(--color-bg-surface)",padding:"16px"},children:r.jsx(n,{...e})})},a={args:{diffText:`--- a/new.txt
+++ b/new.txt
@@ -0,0 +1,3 @@
+Line 1
+Line 2
+Line 3`},render:e=>r.jsx("div",{style:{width:"400px",backgroundColor:"var(--color-bg-surface)",padding:"16px"},children:r.jsx(n,{...e})})},p={args:{diffText:`--- a/old.txt
+++ b/old.txt
@@ -1,3 +0,0 @@
-Line 1
-Line 2
-Line 3`},render:e=>r.jsx("div",{style:{width:"400px",backgroundColor:"var(--color-bg-surface)",padding:"16px"},children:r.jsx(n,{...e})})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    diffText: sampleDiff
  },
  render: args => <div style={{
    width: "400px",
    backgroundColor: "var(--color-bg-surface)",
    padding: "16px"
  }}>
      <DiffView {...args} />
    </div>
}`,...o.parameters?.docs?.source},description:{story:`默认状态

简单 diff 示例`,...o.parameters?.docs?.description}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    diffText: ""
  },
  render: args => <div style={{
    width: "400px",
    backgroundColor: "var(--color-bg-surface)",
    padding: "16px"
  }}>
      <DiffView {...args} />
    </div>
}`,...i.parameters?.docs?.source},description:{story:`空 diff

无差异时的状态`,...i.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    diffText: longDiff
  },
  render: args => <div style={{
    width: "500px",
    backgroundColor: "var(--color-bg-surface)",
    padding: "16px"
  }}>
      <DiffView {...args} />
    </div>
}`,...t.parameters?.docs?.source},description:{story:`长 diff

较长的差异内容`,...t.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    diffText: sampleDiff
  },
  render: args => <div style={{
    width: "280px",
    backgroundColor: "var(--color-bg-surface)",
    padding: "16px"
  }}>
      <DiffView {...args} />
    </div>
}`,...s.parameters?.docs?.source},description:{story:`窄宽度

最小宽度下的布局`,...s.parameters?.docs?.description}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    diffText: longDiff
  },
  render: args => <div style={{
    width: "800px",
    backgroundColor: "var(--color-bg-surface)",
    padding: "16px"
  }}>
      <DiffView {...args} />
    </div>
}`,...d.parameters?.docs?.source},description:{story:`宽布局

较宽容器下的布局`,...d.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    diffText: \`--- a/new.txt
+++ b/new.txt
@@ -0,0 +1,3 @@
+Line 1
+Line 2
+Line 3\`
  },
  render: args => <div style={{
    width: "400px",
    backgroundColor: "var(--color-bg-surface)",
    padding: "16px"
  }}>
      <DiffView {...args} />
    </div>
}`,...a.parameters?.docs?.source},description:{story:`仅添加

只有添加行的 diff`,...a.parameters?.docs?.description}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    diffText: \`--- a/old.txt
+++ b/old.txt
@@ -1,3 +0,0 @@
-Line 1
-Line 2
-Line 3\`
  },
  render: args => <div style={{
    width: "400px",
    backgroundColor: "var(--color-bg-surface)",
    padding: "16px"
  }}>
      <DiffView {...args} />
    </div>
}`,...p.parameters?.docs?.source},description:{story:`仅删除

只有删除行的 diff`,...p.parameters?.docs?.description}}};const Z=["Default","Empty","LongDiff","NarrowWidth","WideWidth","OnlyAdditions","OnlyDeletions"];export{o as Default,i as Empty,t as LongDiff,s as NarrowWidth,a as OnlyAdditions,p as OnlyDeletions,d as WideWidth,Z as __namedExportsOrder,Y as default};
