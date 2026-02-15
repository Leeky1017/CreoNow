# Knowledge Graph Spec Snapshot (Issue-564)

## Requirement: Chapter completion state extraction MUST update matched entities

The system MUST invoke state extraction when a chapter is completed and MUST update `lastSeenState` for matched entities only.

#### Scenario: S3-STE-S1 update matched entities

- **Given** chapter content includes state changes and matched entities exist in KG
- **When** chapter-complete extraction runs
- **Then** matched entities are updated with latest `lastSeenState`
- **And** updated values are immediately readable from KG entity queries

## Requirement: Unknown entities MUST be skipped with structured warning

The system MUST skip unknown characters and MUST NOT create implicit entities during state write-back.

#### Scenario: S3-STE-S2 skip unknown entity

- **Given** extracted state changes include character names not present in KG
- **When** write-back runs
- **Then** unknown characters are skipped
- **And** a structured warning is logged with `character_name`, `document_id`, and chapter context

## Requirement: Extraction failures MUST degrade without blocking chapter completion

The chapter-complete flow MUST remain available when extraction fails.
The system MUST emit structured degradation signals with error codes and trace fields.

#### Scenario: S3-STE-S3 graceful degradation

- **Given** extraction fails due to timeout or invalid output schema
- **When** chapter-complete extraction runs
- **Then** chapter completion remains successful
- **And** degradation is observable via structured log/error code
