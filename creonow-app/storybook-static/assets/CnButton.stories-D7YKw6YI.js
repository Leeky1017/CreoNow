import{n as e}from"./chunk-zsgVPwQN.js";import{t}from"./jsx-runtime-shnjTBMD.js";import{n,t as r}from"./cn-button-LE9NwyO5.js";var i,a,o,s,c,l,u,d,f,p,m,h;e((()=>{n(),i=t(),a=[`primary`,`ghost`,`danger`],o=[`sm`,`md`,`lg`],s={title:`UI/CnButton`,component:r,tags:[`autodocs`],argTypes:{variant:{control:`select`,options:[...a]},size:{control:`select`,options:[...o]},disabled:{control:`boolean`},loading:{control:`boolean`}},args:{children:`Button`,variant:`primary`,size:`md`,disabled:!1,loading:!1}},c={},l={render:()=>(0,i.jsx)(`div`,{className:`grid grid-cols-3 gap-cn-4 items-end`,children:a.map(e=>o.map(t=>(0,i.jsxs)(r,{variant:e,size:t,children:[e,` `,t]},`${e}-${t}`)))})},u={render:()=>(0,i.jsx)(`div`,{className:`flex gap-cn-4 items-center`,children:a.map(e=>(0,i.jsx)(r,{variant:e,disabled:!0,children:e},e))})},d={render:()=>(0,i.jsx)(`div`,{className:`flex gap-cn-4 items-center`,children:a.map(e=>(0,i.jsx)(r,{variant:e,loading:!0,children:e},e))})},f={args:{variant:`primary`,children:`Primary Button`}},p={args:{variant:`ghost`,children:`Ghost Button`}},m={args:{variant:`danger`,children:`Danger Button`}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid grid-cols-3 gap-cn-4 items-end">
      {variants.map(v => sizes.map(s => <CnButton key={\`\${v}-\${s}\`} variant={v} size={s}>
            {v} {s}
          </CnButton>))}
    </div>
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex gap-cn-4 items-center">
      {variants.map(v => <CnButton key={v} variant={v} disabled>
          {v}
        </CnButton>)}
    </div>
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex gap-cn-4 items-center">
      {variants.map(v => <CnButton key={v} variant={v} loading>
          {v}
        </CnButton>)}
    </div>
}`,...d.parameters?.docs?.source}}},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'primary',
    children: 'Primary Button'
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'ghost',
    children: 'Ghost Button'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    variant: 'danger',
    children: 'Danger Button'
  }
}`,...m.parameters?.docs?.source}}},h=[`Playground`,`AllVariants`,`DisabledStates`,`LoadingStates`,`Primary`,`Ghost`,`Danger`]}))();export{l as AllVariants,m as Danger,u as DisabledStates,p as Ghost,d as LoadingStates,c as Playground,f as Primary,h as __namedExportsOrder,s as default};