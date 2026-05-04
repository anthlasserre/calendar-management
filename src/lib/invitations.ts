import { randomBytes } from "node:crypto";
import { pool, query } from "./db";

export type Invitation = {
  id: number;
  companyId: number;
  email: string;
  token: string;
  invitedBy: number | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

export type InvitationWithCompany = Invitation & {
  companyName: string;
  companySlug: string;
};

const DEFAULT_TTL_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

type InvitationRow = {
  id: number;
  company_id: number;
  email: string;
  token: string;
  invited_by: number | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

function rowToInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    companyId: row.company_id,
    email: row.email,
    token: row.token,
    invitedBy: row.invited_by,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
  };
}

export async function createOrRefreshInvitation(params: {
  companyId: number;
  email: string;
  invitedBy: number | null;
  ttlDays?: number;
}): Promise<Invitation> {
  const email = params.email.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Adresse e-mail invalide.");
  }
  const ttlDays = params.ttlDays ?? DEFAULT_TTL_DAYS;
  const token = generateToken();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query<{ id: number }>(
      `SELECT id FROM company_invitations
        WHERE company_id = $1
          AND lower(email) = lower($2)
          AND accepted_at IS NULL`,
      [params.companyId, email],
    );

    let row: InvitationRow;
    if (existing.rowCount && existing.rowCount > 0) {
      const updated = await client.query<InvitationRow>(
        `UPDATE company_invitations
            SET token = $1,
                expires_at = NOW() + ($2 || ' days')::interval,
                invited_by = $3,
                email = $4
          WHERE id = $5
        RETURNING id, company_id, email, token, invited_by, expires_at, accepted_at, created_at`,
        [token, String(ttlDays), params.invitedBy, email, existing.rows[0].id],
      );
      row = updated.rows[0];
    } else {
      const inserted = await client.query<InvitationRow>(
        `INSERT INTO company_invitations (company_id, email, token, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + ($5 || ' days')::interval)
       RETURNING id, company_id, email, token, invited_by, expires_at, accepted_at, created_at`,
        [params.companyId, email, token, params.invitedBy, String(ttlDays)],
      );
      row = inserted.rows[0];
    }
    await client.query("COMMIT");
    return rowToInvitation(row);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function getInvitationByToken(
  token: string,
): Promise<InvitationWithCompany | null> {
  const result = await query<
    InvitationRow & { company_name: string; company_slug: string }
  >(
    `SELECT i.id, i.company_id, i.email, i.token, i.invited_by, i.expires_at, i.accepted_at, i.created_at,
            c.name AS company_name, c.slug AS company_slug
       FROM company_invitations i
       JOIN companies c ON c.id = i.company_id
      WHERE i.token = $1`,
    [token],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...rowToInvitation(row),
    companyName: row.company_name,
    companySlug: row.company_slug,
  };
}

export async function listPendingInvitations(
  companyId: number,
): Promise<Invitation[]> {
  const result = await query<InvitationRow>(
    `SELECT id, company_id, email, token, invited_by, expires_at, accepted_at, created_at
       FROM company_invitations
      WHERE company_id = $1 AND accepted_at IS NULL
      ORDER BY created_at DESC`,
    [companyId],
  );
  return result.rows.map(rowToInvitation);
}

export async function findPendingInvitationsForEmail(
  email: string,
): Promise<Invitation[]> {
  const result = await query<InvitationRow>(
    `SELECT id, company_id, email, token, invited_by, expires_at, accepted_at, created_at
       FROM company_invitations
      WHERE lower(email) = lower($1)
        AND accepted_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC`,
    [email],
  );
  return result.rows.map(rowToInvitation);
}

export async function revokeInvitation(
  invitationId: number,
  companyId: number,
): Promise<boolean> {
  const result = await query(
    `DELETE FROM company_invitations
      WHERE id = $1 AND company_id = $2 AND accepted_at IS NULL`,
    [invitationId, companyId],
  );
  return (result.rowCount ?? 0) > 0;
}

export class InvitationError extends Error {
  code: "expired" | "already_accepted" | "email_mismatch" | "not_found";
  constructor(code: InvitationError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "InvitationError";
  }
}

export async function acceptInvitation(params: {
  token: string;
  userId: number;
  userEmail: string;
}): Promise<{ companyId: number }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      id: number;
      company_id: number;
      email: string;
      expires_at: string;
      accepted_at: string | null;
    }>(
      `SELECT id, company_id, email, expires_at, accepted_at
         FROM company_invitations
        WHERE token = $1
        FOR UPDATE`,
      [params.token],
    );
    const invite = result.rows[0];
    if (!invite) throw new InvitationError("not_found", "Invitation introuvable.");
    if (invite.accepted_at)
      throw new InvitationError("already_accepted", "Invitation déjà acceptée.");
    if (new Date(invite.expires_at).getTime() < Date.now())
      throw new InvitationError("expired", "Invitation expirée.");
    if (invite.email.toLowerCase() !== params.userEmail.toLowerCase()) {
      throw new InvitationError(
        "email_mismatch",
        "Cette invitation est destinée à une autre adresse e-mail.",
      );
    }

    await client.query(
      `UPDATE users SET company_id = $1 WHERE id = $2`,
      [invite.company_id, params.userId],
    );

    await client.query(
      `UPDATE company_invitations SET accepted_at = NOW() WHERE id = $1`,
      [invite.id],
    );

    await client.query("COMMIT");
    return { companyId: invite.company_id };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
