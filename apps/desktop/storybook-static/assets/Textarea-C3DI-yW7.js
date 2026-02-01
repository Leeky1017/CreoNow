import{j as s}from"./jsx-runtime-BLchON5X.js";const t=["min-h-20","p-3","text-[13px]","leading-[1.5]","rounded-[var(--radius-sm)]","bg-[var(--color-bg-surface)]","text-[var(--color-fg-default)]","border","border-[var(--color-border-default)]","placeholder:text-[var(--color-fg-placeholder)]","transition-colors","duration-[var(--duration-fast)]","ease-[var(--ease-default)]","resize-y","hover:border-[var(--color-border-hover)]","focus-visible:border-[var(--color-border-focus)]","focus-visible:outline","focus-visible:outline-[length:var(--ring-focus-width)]","focus-visible:outline-offset-[var(--ring-focus-offset)]","focus-visible:outline-[var(--color-ring-focus)]","disabled:opacity-50","disabled:cursor-not-allowed","disabled:resize-none"].join(" "),i=["border-[var(--color-error)]","hover:border-[var(--color-error)]","focus-visible:border-[var(--color-error)]"].join(" ");function n({error:e=!1,fullWidth:r=!1,className:o="",...a}){const l=[t,e?i:"",r?"w-full":"",o].filter(Boolean).join(" ");return s.jsx("textarea",{className:l,...a})}n.__docgenInfo={description:`Textarea component following design spec §6.2

Multi-line text input with proper focus and error states.

@example
\`\`\`tsx
<Textarea placeholder="Enter description..." rows={4} />
<Textarea error placeholder="Invalid content" />
<Textarea disabled value="Read only" />
\`\`\``,methods:[],displayName:"Textarea",props:{error:{required:!1,tsType:{name:"boolean"},description:"Show error state styling",defaultValue:{value:"false",computed:!1}},fullWidth:{required:!1,tsType:{name:"boolean"},description:"Full width textarea",defaultValue:{value:"false",computed:!1}},className:{defaultValue:{value:'""',computed:!1},required:!1}}};export{n as T};
