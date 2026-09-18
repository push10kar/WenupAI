import { DatabaseSync } from "node:sqlite";
import { initializeDatabase } from "./schema";

/**
 * Factory creating a SQLite database connection with initialized tables.
 * Default location is ':memory:' for test isolation and ephemeral execution.
 */
export function createDatabase(location: string = ":memory:"): DatabaseSync {
  const db = new DatabaseSync(location);
  initializeDatabase(db);
  return db;
}
