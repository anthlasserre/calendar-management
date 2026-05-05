export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureSchema } = await import("./lib/init-schema");
  await ensureSchema();
}
