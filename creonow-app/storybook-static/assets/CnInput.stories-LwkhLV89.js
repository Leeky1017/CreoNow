import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{t as n}from"./iframe-CPDzDLHQ.js";import{t as r}from"./jsx-runtime-shnjTBMD.js";import{n as i,t as a}from"./utils-Cnq1Vacr.js";var o,s,c,l=e((()=>{o=t(n()),i(),s=r(),c=(0,o.forwardRef)(({size:e=`md`,error:t=!1,errorMessage:n,disabled:r=!1,label:i,className:c,id:l,...u},d)=>{let f=(0,o.useId)(),p=l??f,m=t&&n?`${p}-error`:void 0,h={sm:`h-8 text-cn-xs`,md:`h-9 text-cn-sm`};return(0,s.jsxs)(`div`,{className:`flex flex-col`,children:[i&&(0,s.jsx)(`label`,{htmlFor:p,className:`text-cn-sm font-medium font-cn-ui text-cn-text-primary mb-[6px]`,children:i}),(0,s.jsx)(`input`,{ref:d,id:p,disabled:r,"aria-invalid":t||void 0,"aria-describedby":m,className:a(`w-full border bg-transparent px-cn-3 rounded-cn-md font-cn-ui text-cn-text-primary`,`placeholder:text-cn-text-placeholder`,`transition-colors duration-[120ms]`,`focus:outline-none focus:ring-2`,h[e],t?`border-cn-danger focus:border-cn-danger focus:ring-cn-danger/20`:`border-cn-border-default focus:border-cn-border-focus focus:ring-cn-accent/20`,r&&`opacity-30 bg-cn-bg-hover cursor-not-allowed`,c),...u}),t&&n&&(0,s.jsx)(`p`,{id:m,className:`text-cn-xs text-cn-danger mt-cn-1`,children:n})]})}),c.displayName=`CnInput`;try{c.displayName=`CnInput`,c.__docgenInfo={description:``,displayName:`CnInput`,props:{size:{defaultValue:{value:`md`},description:``,name:`size`,required:!1,type:{name:`enum`,value:[{value:`"sm"`},{value:`"md"`}]}},error:{defaultValue:{value:`false`},description:``,name:`error`,required:!1,type:{name:`boolean`}},errorMessage:{defaultValue:null,description:``,name:`errorMessage`,required:!1,type:{name:`string`}},label:{defaultValue:null,description:``,name:`label`,required:!1,type:{name:`string`}}}}}catch{}})),u,d,f,p,m,h,g,_,v,y;e((()=>{l(),u=r(),d={title:`UI/CnInput`,component:c,tags:[`autodocs`],argTypes:{size:{control:`select`,options:[`sm`,`md`]},error:{control:`boolean`},errorMessage:{control:`text`},disabled:{control:`boolean`},placeholder:{control:`text`},label:{control:`text`}},args:{placeholder:`Enter text...`,size:`md`,error:!1,disabled:!1}},f={},p={args:{placeholder:`Enter text...`}},m={args:{label:`Email Address`,placeholder:`you@example.com`}},h={args:{error:!0,errorMessage:`This field is required`,placeholder:`Enter text...`}},g={args:{disabled:!0,placeholder:`Disabled input`}},_={args:{size:`sm`,placeholder:`Small input`}},v={render:()=>(0,u.jsxs)(`div`,{className:`grid grid-cols-2 gap-cn-6 max-w-lg`,children:[(0,u.jsx)(c,{label:`Default`,placeholder:`Type here...`}),(0,u.jsx)(c,{label:`With value`,defaultValue:`Hello world`}),(0,u.jsx)(c,{label:`Error`,error:!0,errorMessage:`This field is required`,placeholder:`Invalid...`}),(0,u.jsx)(c,{label:`Disabled`,disabled:!0,placeholder:`Disabled`})]})},f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: 'Enter text...'
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    label: 'Email Address',
    placeholder: 'you@example.com'
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    error: true,
    errorMessage: 'This field is required',
    placeholder: 'Enter text...'
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    placeholder: 'Disabled input'
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    size: 'sm',
    placeholder: 'Small input'
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <div className="grid grid-cols-2 gap-cn-6 max-w-lg">
      <CnInput label="Default" placeholder="Type here..." />
      <CnInput label="With value" defaultValue="Hello world" />
      <CnInput label="Error" error errorMessage="This field is required" placeholder="Invalid..." />
      <CnInput label="Disabled" disabled placeholder="Disabled" />
    </div>
}`,...v.parameters?.docs?.source}}},y=[`Playground`,`Default`,`WithLabel`,`ErrorState`,`Disabled`,`SmallSize`,`AllStates`]}))();export{v as AllStates,p as Default,g as Disabled,h as ErrorState,f as Playground,_ as SmallSize,m as WithLabel,y as __namedExportsOrder,d as default};