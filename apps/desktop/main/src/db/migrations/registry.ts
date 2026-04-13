import type { Migration } from "../migrator";
import { initialSchemaMigration } from "./001_initial_schema";
import { kgEntityTypeExtensionMigration } from "./002_kg_entity_type_extension";

export const DB_MIGRATIONS: readonly Migration[] = [
  initialSchemaMigration,
  kgEntityTypeExtensionMigration,
];
