import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadEnv() {
  try {
    const envFile = await readFile(resolve(__dirname, "..", ".env"), "utf8");
    for (const rawLine of envFile.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function main() {
  await loadEnv();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(
      "DATABASE_URL est requis. Copiez .env.example vers .env et complétez les valeurs.",
    );
    process.exit(1);
  }

  const schemaPath = resolve(__dirname, "..", "src", "lib", "schema.sql");
  const schema = await readFile(schemaPath, "utf8");

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(schema);
    console.log("Schéma initialisé avec succès.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Échec de l'initialisation de la base :", error);
  process.exit(1);
});
