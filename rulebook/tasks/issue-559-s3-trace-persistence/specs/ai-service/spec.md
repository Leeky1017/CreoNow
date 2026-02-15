# AI Service Trace Persistence Spec Reference

- Source change: `openspec/changes/s3-trace-persistence/specs/ai-service-delta.md`
- Scenario IDs:
  - `S3-TRACE-S1`
  - `S3-TRACE-S2`
  - `S3-TRACE-S3`

## Scope

- Persist generation traces to `generation_traces`.
- Persist feedback linkage to `trace_feedback`.
- Emit structured degradation signal when trace persistence fails.
