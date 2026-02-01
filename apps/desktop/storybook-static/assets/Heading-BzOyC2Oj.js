import{j as o}from"./jsx-runtime-BLchON5X.js";const d={h1:"text-2xl font-semibold leading-[1.2] tracking-[-0.02em]",h2:"text-base font-semibold leading-[1.3] tracking-[-0.01em]",h3:"text-sm font-medium leading-[1.4] tracking-normal",h4:"text-[13px] font-medium leading-[1.4] tracking-normal"},u={default:"text-[var(--color-fg-default)]",muted:"text-[var(--color-fg-muted)]",subtle:"text-[var(--color-fg-subtle)]"};function m({level:e="h2",as:a,color:l="default",className:t="",children:n,...i}){const s=e,r=["font-[var(--font-family-ui)]",d[a??e],u[l],t].filter(Boolean).join(" ");return o.jsx(s,{className:r,...i,children:n})}m.__docgenInfo={description:`Heading component following design spec §4.2 Typography

Provides semantic heading elements with consistent styling.
Use for page titles, section headers, and card titles.

@example
\`\`\`tsx
<Heading level="h1">Page Title</Heading>
<Heading level="h2">Section Header</Heading>
<Heading level="h3" color="muted">Card Title</Heading>

// Use \`as\` to override visual style while keeping semantics
<Heading level="h2" as="h1">Visually Large but Semantic H2</Heading>
\`\`\``,methods:[],displayName:"Heading",props:{level:{required:!1,tsType:{name:"union",raw:'"h1" | "h2" | "h3" | "h4"',elements:[{name:"literal",value:'"h1"'},{name:"literal",value:'"h2"'},{name:"literal",value:'"h3"'},{name:"literal",value:'"h4"'}]},description:"Heading level (semantic and visual)",defaultValue:{value:'"h2"',computed:!1}},as:{required:!1,tsType:{name:"union",raw:'"h1" | "h2" | "h3" | "h4"',elements:[{name:"literal",value:'"h1"'},{name:"literal",value:'"h2"'},{name:"literal",value:'"h3"'},{name:"literal",value:'"h4"'}]},description:"Visual style override (renders different level than semantic)"},color:{required:!1,tsType:{name:"union",raw:'"default" | "muted" | "subtle"',elements:[{name:"literal",value:'"default"'},{name:"literal",value:'"muted"'},{name:"literal",value:'"subtle"'}]},description:"Text color",defaultValue:{value:'"default"',computed:!1}},children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:"Heading content"},className:{defaultValue:{value:'""',computed:!1},required:!1}}};export{m as H};
