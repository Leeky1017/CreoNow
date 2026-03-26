-- Adds version snapshot word count for P0 snapshot history timeline metadata.

ALTER TABLE document_versions
  ADD COLUMN word_count INTEGER NOT NULL DEFAULT 0;
