type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const DEFAULT_FROM = "onboarding@resend.dev";

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  const from = process.env.EMAIL_FROM ?? DEFAULT_FROM;

  if (!apiKey) {
    // Dev fallback: log to console so the link is still usable.
    console.log(
      `\n=== [DEV] Email à ${params.to} ===\nSujet : ${params.subject}\n\n${params.text}\n=============================\n`,
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend a renvoyé ${res.status}: ${detail}`);
  }
}

export function renderMagicLinkEmail(url: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Connexion à Horaires du bureau";
  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family: ui-sans-serif, system-ui, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px;">
      <h1 style="font-size:18px; margin:0 0 12px;">Horaires du bureau</h1>
      <p style="margin:0 0 16px; color:#475569;">Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable 24 heures et ne peut être utilisé qu'une seule fois.</p>
      <p style="margin:24px 0;">
        <a href="${url}" style="display:inline-block; padding:10px 18px; border-radius:8px; background:#3a3fe6; color:#ffffff; text-decoration:none; font-weight:600;">Se connecter</a>
      </p>
      <p style="margin:0; color:#94a3b8; font-size:12px;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
    </div>
  </body>
</html>`;
  const text = `Connectez-vous à Horaires du bureau en suivant ce lien (valable 24 heures) :\n\n${url}\n`;
  return { subject, html, text };
}

export function renderInvitationEmail(params: {
  url: string;
  companyName: string;
  inviterEmail: string | null;
}): { subject: string; html: string; text: string } {
  const { url, companyName, inviterEmail } = params;
  const subject = `Invitation à rejoindre ${companyName}`;
  const inviter = inviterEmail
    ? `${inviterEmail} vous invite`
    : "Vous êtes invité·e";
  const html = `<!doctype html>
<html lang="fr">
  <body style="font-family: ui-sans-serif, system-ui, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px;">
      <h1 style="font-size:18px; margin:0 0 12px;">Invitation à ${escapeHtml(companyName)}</h1>
      <p style="margin:0 0 16px; color:#475569;">${escapeHtml(inviter)} à rejoindre l'équipe sur Horaires du bureau. Le lien ci-dessous est valable 7 jours.</p>
      <p style="margin:24px 0;">
        <a href="${url}" style="display:inline-block; padding:10px 18px; border-radius:8px; background:#3a3fe6; color:#ffffff; text-decoration:none; font-weight:600;">Accepter l'invitation</a>
      </p>
      <p style="margin:0; color:#94a3b8; font-size:12px;">Si vous ne connaissez pas cette entreprise, ignorez ce message.</p>
    </div>
  </body>
</html>`;
  const text = `${inviter} à rejoindre ${companyName} sur Horaires du bureau.\n\nAcceptez ici (valable 7 jours) :\n${url}\n`;
  return { subject, html, text };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
