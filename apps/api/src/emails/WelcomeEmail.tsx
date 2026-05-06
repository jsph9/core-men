// Email template: WelcomeEmail
// TODO: Replace with full @react-email/components template
export const WelcomeEmail = ({ name }: { name: string }) => ({
  subject: 'Bienvenido a CoreMen',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a2e;">¡Bienvenido a CoreMen!</h1>
      <p>Hola <strong>${name}</strong>,</p>
      <p>Tu cuenta ha sido creada exitosamente. Ya puedes explorar nuestro catálogo.</p>
      <a href="${process.env.FRONTEND_URL}" style="display: inline-block; padding: 12px 24px; background: #e94560; color: white; text-decoration: none; border-radius: 6px;">Ir a CoreMen</a>
    </div>
  `,
});
