// Email template: QuoteResponseEmail
export const QuoteResponseEmail = ({ quoteId, message }: { quoteId: string; message: string }) => ({
  subject: `Respuesta a tu cotización #${quoteId}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a1a2e;">Cotización respondida</h1>
      <p>El comerciante ha respondido tu cotización <strong>#${quoteId}</strong>:</p>
      <blockquote style="border-left: 4px solid #e94560; padding-left: 16px; color: #555;">${message}</blockquote>
      <a href="${process.env.FRONTEND_URL}/cotizaciones/${quoteId}" style="display: inline-block; padding: 12px 24px; background: #e94560; color: white; text-decoration: none; border-radius: 6px;">Ver cotización</a>
    </div>
  `,
});
