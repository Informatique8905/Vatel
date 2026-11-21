import { env } from '../config/env.js';

// Envoi d'e-mails transactionnels via l'API REST Resend (aucune clé en dur :
// RESEND_API_KEY vient de .env). Sans clé en développement, l'e-mail est
// simulé : la fonction renvoie { skipped: true } et l'appelant peut renvoyer
// le code dans la réponse de dev.

const SUBJECTS = {
  EMAIL_VERIFICATION: 'Votre code de vérification — Cantine Vatel',
  PASSWORD_RESET: 'Réinitialisation de votre mot de passe — Cantine Vatel',
};

const LABELS = {
  EMAIL_VERIFICATION: 'Bienvenue ! Voici votre code de vérification :',
  PASSWORD_RESET: 'Voici le code pour réinitialiser votre mot de passe :',
};

const otpHtml = (code, purpose) => `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
    <h2 style="color:#072A5D;margin:0 0 12px">Cantine Vatel</h2>
    <p style="font-size:15px;color:#1D1D1B">${LABELS[purpose] ?? 'Votre code :'}</p>
    <p style="font-size:34px;font-weight:800;letter-spacing:10px;color:#072A5D;margin:16px 0;text-align:center">${code}</p>
    <p style="font-size:13px;color:#5C5C5C">
      Ce code expire dans ${env.otpTtlMinutes} minutes et n'est utilisable qu'une fois.
      Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.
    </p>
  </div>`;

export const sendOtpEmail = async (to, code, purpose) => {
  if (!env.resendApiKey) {
    if (!env.isProd) console.warn(`[mailer] RESEND_API_KEY absent — code ${purpose} pour ${to} : ${code}`);
    return { skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [to],
      subject: SUBJECTS[purpose] ?? 'Cantine Vatel',
      html: otpHtml(code, purpose),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // Ne jamais exposer le détail Resend au client.
    throw new Error(`Envoi e-mail échoué (${res.status}) ${detail.slice(0, 200)}`);
  }
  return { skipped: false };
};
