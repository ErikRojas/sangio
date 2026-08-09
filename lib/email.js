import { Resend } from "resend";

// Si no está configurado RESEND_API_KEY, el envío se omite en silencio
// (así el resto de la app sigue funcionando aunque no hayas activado
// las notificaciones todavía).
export async function sendClientNotification({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !to) return;

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Estudio <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Error enviando correo de notificación:", err.message);
  }
}
