import{j as e}from"./jsx-runtime-BLchON5X.js";import{fn as o}from"./index-BcR7jcGp.js";import{S as r}from"./SkillPicker-B04EGmsV.js";import"./index-kA4PVysc.js";import"./Button-B9XLIlTV.js";import"./Input-BR80orUP.js";import"./index-DDi9LDaq.js";import"./Textarea-C3DI-yW7.js";import"./Card-D2dqmnxE.js";import"./ListItem-CyD6nTsv.js";import"./Text-CW-Kyc9R.js";import"./Heading-BzOyC2Oj.js";import"./Dialog-DJV5UiAm.js";import"./index-DkX_XZs0.js";import"./index-BWwYGMPc.js";import"./index-C0udIITE.js";import"./index-Dx0N0K8E.js";import"./index-BpH7dOlt.js";import"./index-CQ0IhcTf.js";import"./index-c9SlT_P8.js";import"./index-nu25GvvV.js";import"./Popover-BMinsKFS.js";import"./index-wwK3GREC.js";import"./index-CEv_TvBl.js";import"./Select-DBTPtHXT.js";import"./index-D6SgtPiA.js";import"./index-CAq0tSys.js";import"./index-Tf3TKiO9.js";import"./index-BEZKqDeb.js";import"./Checkbox-Ddw3urWg.js";import"./Tabs-DmRrGnuH.js";import"./index-CDK04lop.js";import"./Badge-0PIbcpDO.js";import"./Avatar-CFHo7YSR.js";import"./Spinner-BG3j59Um.js";import"./Skeleton-CwzwMFJo.js";import"./Tooltip-Ca9CUhYJ.js";import"./Toast-HPSiDIc2.js";import"./Accordion-F8I8yqG1.js";import"./Radio-DYZtN_dz.js";const X={title:"Features/SkillPicker",component:r,parameters:{layout:"centered",docs:{description:{component:`SkillPicker 组件 Story

功能：
- 技能列表弹窗
- 选中/禁用状态
- 点击选择`}}},tags:["autodocs"],argTypes:{open:{control:"boolean",description:"Whether the picker is open"},selectedSkillId:{control:"text",description:"Currently selected skill ID"}},args:{onOpenChange:o(),onSelectSkillId:o()}},d=[{id:"default",name:"Default",enabled:!0,valid:!0,scope:"global"},{id:"rewrite",name:"Rewrite",enabled:!0,valid:!0,scope:"global"},{id:"summarize",name:"Summarize",enabled:!0,valid:!0,scope:"project"},{id:"disabled-skill",name:"Disabled Skill",enabled:!1,valid:!0,scope:"global"},{id:"invalid-skill",name:"Invalid Skill",enabled:!0,valid:!1,scope:"global"}],n={args:{open:!0,items:d,selectedSkillId:"default"},render:i=>e.jsx("div",{style:{position:"relative",width:"300px",height:"400px"},children:e.jsx(r,{...i})})},t={args:{open:!1,items:d,selectedSkillId:"default"},render:i=>e.jsxs("div",{style:{position:"relative",width:"300px",height:"400px"},children:[e.jsx(r,{...i}),e.jsx("div",{style:{padding:"20px",color:"var(--color-fg-muted)"},children:"Picker is closed (nothing rendered)"})]})},l={args:{open:!0,items:d,selectedSkillId:"rewrite"},render:i=>e.jsx("div",{style:{position:"relative",width:"300px",height:"400px"},children:e.jsx(r,{...i})})},s={args:{open:!0,items:[],selectedSkillId:""},render:i=>e.jsx("div",{style:{position:"relative",width:"300px",height:"200px"},children:e.jsx(r,{...i})})},a={args:{open:!0,items:[{id:"enabled",name:"Enabled Skill",enabled:!0,valid:!0,scope:"global"},{id:"disabled-1",name:"Disabled 1",enabled:!1,valid:!0,scope:"global"},{id:"disabled-2",name:"Disabled 2",enabled:!1,valid:!0,scope:"global"},{id:"invalid-1",name:"Invalid 1",enabled:!0,valid:!1,scope:"global"},{id:"invalid-2",name:"Invalid 2",enabled:!0,valid:!1,scope:"global"}],selectedSkillId:"enabled"},render:i=>e.jsx("div",{style:{position:"relative",width:"300px",height:"400px"},children:e.jsx(r,{...i})})};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    open: true,
    items: sampleSkills,
    selectedSkillId: "default"
  },
  render: args => <div style={{
    position: "relative",
    width: "300px",
    height: "400px"
  }}>
      <SkillPicker {...args} />
    </div>
}`,...n.parameters?.docs?.source},description:{story:`打开状态

技能选择器打开`,...n.parameters?.docs?.description}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    open: false,
    items: sampleSkills,
    selectedSkillId: "default"
  },
  render: args => <div style={{
    position: "relative",
    width: "300px",
    height: "400px"
  }}>
      <SkillPicker {...args} />
      <div style={{
      padding: "20px",
      color: "var(--color-fg-muted)"
    }}>
        Picker is closed (nothing rendered)
      </div>
    </div>
}`,...t.parameters?.docs?.source},description:{story:`关闭状态

技能选择器关闭（不渲染）`,...t.parameters?.docs?.description}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    open: true,
    items: sampleSkills,
    selectedSkillId: "rewrite"
  },
  render: args => <div style={{
    position: "relative",
    width: "300px",
    height: "400px"
  }}>
      <SkillPicker {...args} />
    </div>
}`,...l.parameters?.docs?.source},description:{story:`选中其他技能

选中 Rewrite 技能`,...l.parameters?.docs?.description}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    open: true,
    items: [],
    selectedSkillId: ""
  },
  render: args => <div style={{
    position: "relative",
    width: "300px",
    height: "200px"
  }}>
      <SkillPicker {...args} />
    </div>
}`,...s.parameters?.docs?.source},description:{story:`空列表

无技能可选`,...s.parameters?.docs?.description}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    open: true,
    items: [{
      id: "enabled",
      name: "Enabled Skill",
      enabled: true,
      valid: true,
      scope: "global"
    }, {
      id: "disabled-1",
      name: "Disabled 1",
      enabled: false,
      valid: true,
      scope: "global"
    }, {
      id: "disabled-2",
      name: "Disabled 2",
      enabled: false,
      valid: true,
      scope: "global"
    }, {
      id: "invalid-1",
      name: "Invalid 1",
      enabled: true,
      valid: false,
      scope: "global"
    }, {
      id: "invalid-2",
      name: "Invalid 2",
      enabled: true,
      valid: false,
      scope: "global"
    }],
    selectedSkillId: "enabled"
  },
  render: args => <div style={{
    position: "relative",
    width: "300px",
    height: "400px"
  }}>
      <SkillPicker {...args} />
    </div>
}`,...a.parameters?.docs?.source},description:{story:`多项禁用

多个技能禁用或无效`,...a.parameters?.docs?.description}}};const Y=["Open","Closed","SelectedRewrite","EmptyList","ManyDisabled"];export{t as Closed,s as EmptyList,a as ManyDisabled,n as Open,l as SelectedRewrite,Y as __namedExportsOrder,X as default};
