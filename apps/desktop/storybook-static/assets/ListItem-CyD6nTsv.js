import{j as m}from"./jsx-runtime-BLchON5X.js";const p=["flex","items-center","gap-2","px-3","rounded-[var(--radius-sm)]","text-[13px]","text-[var(--color-fg-default)]","transition-colors","duration-[var(--duration-fast)]","ease-[var(--ease-default)]"].join(" "),o={compact:"h-8",standard:"h-10"},v=["cursor-pointer","select-none","hover:bg-[var(--color-bg-hover)]","active:bg-[var(--color-bg-active)]","focus-visible:outline","focus-visible:outline-[length:var(--ring-focus-width)]","focus-visible:outline-offset-[-2px]","focus-visible:outline-[var(--color-ring-focus)]"].join(" "),b="bg-[var(--color-bg-selected)]",g=["opacity-50","cursor-not-allowed","pointer-events-none"].join(" ");function h({selected:n=!1,compact:l=!1,interactive:t=!1,disabled:s=!1,className:i="",children:c,onClick:r,onKeyDown:a,...d}){const u=[p,l?o.compact:o.standard,t&&!s?v:"",n?b:"",s?g:"",i].filter(Boolean).join(" ");function f(e){a?.(e),!e.defaultPrevented&&(!t||s||(e.key==="Enter"||e.key===" ")&&(e.preventDefault(),e.currentTarget.click()))}return m.jsx("div",{role:t?"button":void 0,tabIndex:t&&!s?0:void 0,className:u,onClick:r,onKeyDown:t&&!s?f:a,...d,children:c})}h.__docgenInfo={description:`ListItem component following design spec §6.4

Used in lists, trees, and menus. Supports selected and compact modes.

@example
\`\`\`tsx
<ListItem>Default item</ListItem>
<ListItem compact>Compact item</ListItem>
<ListItem selected interactive onClick={handleClick}>
  Selected clickable item
</ListItem>
\`\`\``,methods:[],displayName:"ListItem",props:{selected:{required:!1,tsType:{name:"boolean"},description:"Item is selected/active",defaultValue:{value:"false",computed:!1}},compact:{required:!1,tsType:{name:"boolean"},description:"Use compact height (32px) instead of standard (40px)",defaultValue:{value:"false",computed:!1}},interactive:{required:!1,tsType:{name:"boolean"},description:"Make item clickable with proper hover states",defaultValue:{value:"false",computed:!1}},disabled:{required:!1,tsType:{name:"boolean"},description:"Disable the item",defaultValue:{value:"false",computed:!1}},children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:"List item content"},className:{defaultValue:{value:'""',computed:!1},required:!1}}};export{h as L};
