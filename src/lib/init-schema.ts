import { readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "./db";

const ADVISORY_LOCK_KEY = 727401;

let initPromise: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!initPromise) {
    initPromise = applySchema().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

async function applySchema(): Promise<void> {
  const schemaPath = path.join(process.cwd(), "src", "lib", "schema.sql");
  const schema = await readFile(schemaPath, "utf8");

  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
    try {
      await client.query(schema);
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}
