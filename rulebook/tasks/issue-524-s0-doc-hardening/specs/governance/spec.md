# Governance Delivery Delta

## Change: issue-524-s0-doc-hardening

### Requirement: Sprint0 changes must include anti-regression guidance aligned with roadmap [ADDED]

Sprint0 OpenSpec changes must preserve not only feature intent but also anti-regression wording from roadmap, including pitfall reminders and prevention tags.

#### Scenario: Sprint0 proposals contain pitfall and prevention-tag sections [ADDED]

- **Given** `docs/plans/unified-roadmap.md` defines `踩坑提醒` and `防治标签` for Sprint0 changes
- **When** Sprint0 proposal docs are patched
- **Then** each `openspec/changes/s0-*/proposal.md` contains both sections
- **And** labels are aligned with the roadmap mapping for that change
