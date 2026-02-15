# Governance Task Spec

## Requirement: s3-kg-last-seen must deliver with TDD evidence and compatibility safety

The task must implement `lastSeenState` end-to-end for KG entity flow, keep legacy records compatible, and provide Red/Green evidence.

#### Scenario: S3-KGLS-S1 write/read roundtrip is guaranteed

- **Given** an existing KG entity
- **When** `lastSeenState` is updated
- **Then** value is persisted to `kg_entities.last_seen_state`
- **And** later reads return the same `lastSeenState`

#### Scenario: S3-KGLS-S2 legacy null state remains compatible

- **Given** legacy entities with `last_seen_state` null
- **When** entity is read or other fields are updated
- **Then** CRUD flow remains stable without missing-field errors
- **And** UI keeps lastSeenState as empty state without breaking editing
