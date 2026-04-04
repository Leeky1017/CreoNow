WITH ordered_versions AS (
  SELECT
    version_id,
    LAG(version_id) OVER (
      PARTITION BY document_id
      ORDER BY created_at ASC, rowid ASC
    ) AS computed_parent_snapshot_id
  FROM document_versions
)
UPDATE document_versions
SET parent_snapshot_id = (
  SELECT ordered_versions.computed_parent_snapshot_id
  FROM ordered_versions
  WHERE ordered_versions.version_id = document_versions.version_id
);
