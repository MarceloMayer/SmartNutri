import { Resend } from 'resend';

import { env } from '../config/env';

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    client = new Resend(env.resend.apiKey);
  }

  return client;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const { error } = await getClient().emails.send({
    from: env.resend.fromEmail,
    to,
    subject: 'Redefinição de senha — Smart Nutri',
    html: `
      <p>Você solicitou a redefinição da sua senha no Smart Nutri.</p>
      <p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a></p>
      <p>Este link expira em 1 hora. Se você não solicitou isso, ignore este email.</p>
    `
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
