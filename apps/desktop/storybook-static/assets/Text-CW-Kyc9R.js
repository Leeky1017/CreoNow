import{j as s}from"./jsx-runtime-BLchON5X.js";const d={body:"text-[13px] leading-[1.5] font-normal font-[var(--font-family-ui)]",bodyLarge:"text-base leading-[1.8] font-normal font-[var(--font-family-body)]",small:"text-xs leading-[1.4] font-normal font-[var(--font-family-ui)]",tiny:"text-[11px] leading-[1.2] font-normal font-[var(--font-family-ui)]",label:"text-[10px] leading-[1.2] font-medium tracking-[0.1em] uppercase font-[var(--font-family-ui)]",code:"text-[13px] leading-[1.5] font-normal font-[var(--font-family-mono)]"},m={default:"text-[var(--color-fg-default)]",muted:"text-[var(--color-fg-muted)]",subtle:"text-[var(--color-fg-subtle)]",placeholder:"text-[var(--color-fg-placeholder)]",error:"text-[var(--color-error)]",success:"text-[var(--color-success)]",warning:"text-[var(--color-warning)]",info:"text-[var(--color-info)]"},u={normal:"font-normal",medium:"font-medium",semibold:"font-semibold",bold:"font-bold"};function f({size:a="body",color:l="default",as:t="span",weight:e,className:n="",children:o,...r}){const i=[d[a],m[l],e?u[e]:"",n].filter(Boolean).join(" ");return s.jsx(t,{className:i,...r,children:o})}f.__docgenInfo={description:`Text component following design spec §4.2 Typography

Provides consistent text styling across the application.
Use for body text, labels, captions, and code snippets.

@example
\`\`\`tsx
<Text>Default body text</Text>
<Text size="small" color="muted">Secondary info</Text>
<Text size="label">SECTION LABEL</Text>
<Text size="code">console.log("Hello")</Text>
\`\`\``,methods:[],displayName:"Text",props:{size:{required:!1,tsType:{name:"union",raw:`| "body"
| "bodyLarge"
| "small"
| "tiny"
| "label"
| "code"`,elements:[{name:"literal",value:'"body"'},{name:"literal",value:'"bodyLarge"'},{name:"literal",value:'"small"'},{name:"literal",value:'"tiny"'},{name:"literal",value:'"label"'},{name:"literal",value:'"code"'}]},description:"Typography size variant",defaultValue:{value:'"body"',computed:!1}},color:{required:!1,tsType:{name:"union",raw:`| "default"
| "muted"
| "subtle"
| "placeholder"
| "error"
| "success"
| "warning"
| "info"`,elements:[{name:"literal",value:'"default"'},{name:"literal",value:'"muted"'},{name:"literal",value:'"subtle"'},{name:"literal",value:'"placeholder"'},{name:"literal",value:'"error"'},{name:"literal",value:'"success"'},{name:"literal",value:'"warning"'},{name:"literal",value:'"info"'}]},description:"Text color",defaultValue:{value:'"default"',computed:!1}},as:{required:!1,tsType:{name:"union",raw:'"span" | "p" | "div" | "label"',elements:[{name:"literal",value:'"span"'},{name:"literal",value:'"p"'},{name:"literal",value:'"div"'},{name:"literal",value:'"label"'}]},description:"Render as different element",defaultValue:{value:'"span"',computed:!1}},weight:{required:!1,tsType:{name:"union",raw:'"normal" | "medium" | "semibold" | "bold"',elements:[{name:"literal",value:'"normal"'},{name:"literal",value:'"medium"'},{name:"literal",value:'"semibold"'},{name:"literal",value:'"bold"'}]},description:"Font weight override"},children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:"Text content"},className:{defaultValue:{value:'""',computed:!1},required:!1}}};export{f as T};
