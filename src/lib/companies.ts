import { pool, query } from "./db";

export type Company = {
  id: number;
  slug: string;
  name: string;
  timezone: string;
};

export async function getCompanyById(id: number): Promise<Company | null> {
  const result = await query<Company>(
    `SELECT id, slug, name, timezone FROM companies WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const result = await query<Company>(
    `SELECT id, slug, name, timezone FROM companies WHERE slug = $1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

export type CompanyMember = {
  userId: number;
  email: string;
  name: string | null;
  joinedAt: string;
};

export async function listMembersOfCompany(
  companyId: number,
): Promise<CompanyMember[]> {
  const result = await query<{
    user_id: number;
    email: string;
    name: string | null;
    joined_at: string;
  }>(
    `SELECT u.id AS user_id, u.email, u.name, m.created_at AS joined_at
       FROM user_company_memberships m
       JOIN users u ON u.id = m.user_id
      WHERE m.company_id = $1
      ORDER BY m.created_at ASC`,
    [companyId],
  );
  return result.rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    name: row.name,
    joinedAt: row.joined_at,
  }));
}

export async function listCompaniesForUser(
  userId: number,
): Promise<Company[]> {
  const result = await query<Company>(
    `SELECT c.id, c.slug, c.name, c.timezone
       FROM user_company_memberships m
       JOIN companies c ON c.id = m.company_id
      WHERE m.user_id = $1
      ORDER BY c.name ASC`,
    [userId],
  );
  return result.rows;
}

export async function userBelongsToCompany(
  userId: number,
  companyId: number,
): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM user_company_memberships
      WHERE user_id = $1 AND company_id = $2`,
    [userId, companyId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setCurrentCompany(
  userId: number,
  companyId: number,
): Promise<void> {
  const allowed = await userBelongsToCompany(userId, companyId);
  if (!allowed) throw new Error("User is not a member of this company.");
  await query(
    `UPDATE users SET current_company_id = $1 WHERE id = $2`,
    [companyId, userId],
  );
}

export async function getCompanyForUserId(
  userId: number,
): Promise<Company | null> {
  const result = await query<Company>(
    `SELECT c.id, c.slug, c.name, c.timezone
       FROM users u
       JOIN companies c ON c.id = u.current_company_id
      WHERE u.id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSlugSuffix(length = 5): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
  }
  return s;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function deriveCompanyDefaults(email: string): { name: string; baseSlug: string } {
  const domain = email.split("@")[1] ?? "entreprise";
  const root = domain.split(".")[0] ?? "entreprise";
  const name = root.charAt(0).toUpperCase() + root.slice(1);
  const baseSlug = slugify(root) || "entreprise";
  return { name, baseSlug };
}

async function provisionCompany(params: {
  userId: number;
  name: string;
  baseSlug: string;
}): Promise<Company> {
  const { userId, name, baseSlug } = params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let slug = `${baseSlug}-${randomSlugSuffix()}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const taken = await client.query(
        `SELECT 1 FROM companies WHERE slug = $1`,
        [slug],
      );
      if (taken.rowCount === 0) break;
      slug = `${baseSlug}-${randomSlugSuffix()}`;
    }

    const created = await client.query<Company>(
      `INSERT INTO companies (slug, name)
       VALUES ($1, $2)
       RETURNING id, slug, name, timezone`,
      [slug, name],
    );
    const company = created.rows[0];

    await client.query(
      `INSERT INTO user_company_memberships (user_id, company_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, company.id],
    );

    await client.query(
      `UPDATE users SET current_company_id = $1 WHERE id = $2`,
      [company.id, userId],
    );

    // Initialise les 7 jours de la semaine pour cette entreprise.
    await client.query(
      `INSERT INTO regular_hours (company_id, day_of_week, is_open)
       SELECT $1, g, FALSE
         FROM generate_series(0, 6) AS g
         ON CONFLICT (company_id, day_of_week) DO NOTHING`,
      [company.id],
    );

    await client.query("COMMIT");
    return company;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureCompanyForUser(
  userId: number,
  email: string,
): Promise<Company> {
  const existing = await getCompanyForUserId(userId);
  if (existing) return existing;

  const { name, baseSlug } = deriveCompanyDefaults(email);
  return provisionCompany({ userId, name, baseSlug });
}

export async function createCompanyForUser(
  userId: number,
  name: string,
): Promise<Company> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Le nom de l'entreprise est requis.");
  const baseSlug = slugify(trimmed) || "entreprise";
  return provisionCompany({ userId, name: trimmed.slice(0, 120), baseSlug });
}

export async function updateCompany(
  id: number,
  patch: { name?: string; slug?: string; timezone?: string },
): Promise<Company> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (patch.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(patch.name);
  }
  if (patch.slug !== undefined) {
    fields.push(`slug = $${idx++}`);
    values.push(patch.slug);
  }
  if (patch.timezone !== undefined) {
    fields.push(`timezone = $${idx++}`);
    values.push(patch.timezone);
  }
  if (fields.length === 0) {
    const current = await getCompanyById(id);
    if (!current) throw new Error("Company not found");
    return current;
  }
  values.push(id);
  const result = await query<Company>(
    `UPDATE companies SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, slug, name, timezone`,
    values,
  );
  return result.rows[0];
}
