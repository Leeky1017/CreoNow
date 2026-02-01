import{j as m}from"./jsx-runtime-BLchON5X.js";const c=["bg-[var(--color-bg-hover)]","overflow-hidden","relative"].join(" "),p=["before:absolute","before:inset-0","before:bg-gradient-to-r","before:from-transparent","before:via-[var(--color-bg-active)]","before:to-transparent","before:animate-shimmer"].join(" "),f={text:"rounded-[var(--radius-sm)]",circular:"rounded-[var(--radius-full)]",rectangular:"rounded-[var(--radius-md)]"},h={text:{width:"100%",height:"1em"},circular:{width:"40px",height:"40px"},rectangular:{width:"100%",height:"100px"}};function g({variant:t="text",width:e,height:a,animate:r=!0,className:i="",style:o,...l}){const n=h[t],s=e!==void 0?typeof e=="number"?`${e}px`:e:n.width,u=a!==void 0?typeof a=="number"?`${a}px`:a:n.height,d=[c,f[t],r?p:"",i].filter(Boolean).join(" ");return m.jsx("div",{className:d,style:{width:s,height:u,...o},role:"progressbar","aria-busy":"true","aria-valuemin":0,"aria-valuemax":100,"aria-label":"Loading...",...l})}g.__docgenInfo={description:`Skeleton component for loading placeholder

Displays a placeholder with optional shimmer animation
while content is loading.

@example
\`\`\`tsx
<Skeleton variant="text" width="80%" />
<Skeleton variant="circular" width={40} height={40} />
<Skeleton variant="rectangular" height={200} />
\`\`\``,methods:[],displayName:"Skeleton",props:{variant:{required:!1,tsType:{name:"union",raw:'"text" | "circular" | "rectangular"',elements:[{name:"literal",value:'"text"'},{name:"literal",value:'"circular"'},{name:"literal",value:'"rectangular"'}]},description:"Shape variant",defaultValue:{value:'"text"',computed:!1}},width:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:'Width (CSS value, e.g., "100%", "200px")'},height:{required:!1,tsType:{name:"union",raw:"string | number",elements:[{name:"string"},{name:"number"}]},description:'Height (CSS value, e.g., "20px", "100%")'},animate:{required:!1,tsType:{name:"boolean"},description:"Enable animation",defaultValue:{value:"true",computed:!1}},className:{defaultValue:{value:'""',computed:!1},required:!1}}};export{g as S};
