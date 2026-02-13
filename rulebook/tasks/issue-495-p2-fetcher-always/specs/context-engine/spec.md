## Delta Alignment

- Source change: `openspec/changes/p2-fetcher-always/specs/context-engine/spec.md`
- Requirement: `REQ-CE-RULES-KG-ALWAYS`
- Scope:
  - Rules fetcher queries `kgService.entityList({ filter: { aiContextLevel: "always" } })`
  - Each entity is formatted into structured context text with `kg:always:<entityId>` source
  - KG failures degrade to empty chunks with warning `KG_UNAVAILABLE: 知识图谱数据未注入`
