import{j as n}from"./jsx-runtime-BLchON5X.js";const s=["rounded-[var(--radius-xl)]","bg-[var(--color-bg-surface)]","transition-all","duration-[var(--duration-fast)]","ease-[var(--ease-default)]"].join(" "),i={default:"border border-[var(--color-border-default)]",raised:"border border-[var(--color-border-default)] shadow-[var(--shadow-md)]",bordered:"border-2 border-[var(--color-border-default)]"},u=["cursor-pointer","hover:border-[var(--color-border-hover)]","hover:shadow-[var(--shadow-sm)]"].join(" ");function c({variant:e="default",hoverable:a=!1,noPadding:r=!1,className:o="",children:t,...d}){const l=[s,i[e],a?u:"",r?"":"p-6",o].filter(Boolean).join(" ");return n.jsx("div",{className:l,...d,children:t})}c.__docgenInfo={description:`Card component following design spec §6.3

Container component with consistent styling for content grouping.
Supports multiple variants and optional hover effects.

@example
\`\`\`tsx
<Card>
  <h2>Card Title</h2>
  <p>Card content goes here.</p>
</Card>

<Card variant="raised" hoverable onClick={handleClick}>
  Clickable elevated card
</Card>
\`\`\``,methods:[],displayName:"Card",props:{variant:{required:!1,tsType:{name:"union",raw:'"default" | "raised" | "bordered"',elements:[{name:"literal",value:'"default"'},{name:"literal",value:'"raised"'},{name:"literal",value:'"bordered"'}]},description:"Visual style variant",defaultValue:{value:'"default"',computed:!1}},hoverable:{required:!1,tsType:{name:"boolean"},description:"Enable hover effect (border highlight, optional shadow)",defaultValue:{value:"false",computed:!1}},noPadding:{required:!1,tsType:{name:"boolean"},description:"Remove padding for custom layouts",defaultValue:{value:"false",computed:!1}},children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:"Card content"},className:{defaultValue:{value:'""',computed:!1},required:!1}}};export{c as C};
