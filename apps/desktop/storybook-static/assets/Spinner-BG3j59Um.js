import{j as e}from"./jsx-runtime-BLchON5X.js";const r={xs:12,sm:16,md:24,lg:32,xl:48};function o({size:l="md",label:n="Loading",className:s="",...i}){const a=r[l],t=["animate-spin","text-current",s].filter(Boolean).join(" ");return e.jsxs("svg",{className:t,xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",width:a,height:a,role:"status","aria-label":n,...i,children:[e.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),e.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"})]})}o.__docgenInfo={description:`Spinner component for loading states

Uses a circular animation with CSS animate-spin.
Accessible with proper aria-label.

@example
\`\`\`tsx
<Spinner size="md" />
<Spinner size="lg" label="Loading content..." />
\`\`\``,methods:[],displayName:"Spinner",props:{size:{required:!1,tsType:{name:"union",raw:'"xs" | "sm" | "md" | "lg" | "xl"',elements:[{name:"literal",value:'"xs"'},{name:"literal",value:'"sm"'},{name:"literal",value:'"md"'},{name:"literal",value:'"lg"'},{name:"literal",value:'"xl"'}]},description:"Size of the spinner",defaultValue:{value:'"md"',computed:!1}},label:{required:!1,tsType:{name:"string"},description:"Custom label for accessibility",defaultValue:{value:'"Loading"',computed:!1}},className:{defaultValue:{value:'""',computed:!1},required:!1}}};export{o as S};
