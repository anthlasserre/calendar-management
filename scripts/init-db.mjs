import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
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
