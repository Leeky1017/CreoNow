import{j as s}from"./jsx-runtime-BLchON5X.js";import{R as n}from"./index-DDi9LDaq.js";const i=["h-10","px-3","text-[13px]","leading-10","rounded-[var(--radius-sm)]","bg-[var(--color-bg-surface)]","text-[var(--color-fg-default)]","border","border-[var(--color-border-default)]","placeholder:text-[var(--color-fg-placeholder)]","transition-colors","duration-[var(--duration-fast)]","ease-[var(--ease-default)]","hover:border-[var(--color-border-hover)]","focus-visible:border-[var(--color-border-focus)]","focus-visible:outline","focus-visible:outline-[length:var(--ring-focus-width)]","focus-visible:outline-offset-[var(--ring-focus-offset)]","focus-visible:outline-[var(--color-ring-focus)]","disabled:opacity-50","disabled:cursor-not-allowed"].join(" "),u=["border-[var(--color-error)]","hover:border-[var(--color-error)]","focus-visible:border-[var(--color-error)]"].join(" "),d=n.forwardRef(function({error:e=!1,fullWidth:r=!1,className:o="",...a},l){const t=[i,e?u:"",r?"w-full":"",o].filter(Boolean).join(" ");return s.jsx("input",{ref:l,className:t,...a})});d.__docgenInfo={description:`Input component following design spec §6.2

Single-line text input with proper focus and error states.
Supports ref forwarding for focus management.

@example
\`\`\`tsx
<Input placeholder="Enter text..." />
<Input error placeholder="Invalid input" />
<Input disabled value="Disabled" />
<Input ref={inputRef} /> // Ref forwarding
\`\`\``,methods:[],displayName:"Input",props:{error:{required:!1,tsType:{name:"boolean"},description:"Show error state styling",defaultValue:{value:"false",computed:!1}},fullWidth:{required:!1,tsType:{name:"boolean"},description:"Full width input",defaultValue:{value:"false",computed:!1}},className:{defaultValue:{value:'""',computed:!1},required:!1}}};export{d as I};
