import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import nodemailer from 'nodemailer';

// Plugin para Endpoint de Envio de E-mails via Hostinger SMTP
function emailApiPlugin() {
  return {
    name: 'email-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/send-email', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const to = data.to;
            const subject = data.subject || 'Notificação Amoreja Amigurumi';
            const html = data.html || data.text || '';
            const password = data.password || '10207597Rdv*';
            const user = data.user || 'amoreja@amoreja.com.br';
            const smtpHost = data.smtpHost || 'smtp.hostinger.com';
            const smtpPort = parseInt(data.smtpPort || '465');

            if (!to) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Destinatário (to) obrigatório.' }));
            }

            console.log(`[Hostinger SMTP Server] Enviando e-mail para: ${to} | Assunto: ${subject}`);

            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: smtpPort,
              secure: smtpPort === 465,
              auth: {
                user,
                pass: password
              }
            });

            const info = await transporter.sendMail({
              from: '"Amoreja Amigurumi" <amoreja@amoreja.com.br>',
              to,
              subject,
              html
            });

            console.log(`[Hostinger SMTP Server] E-mail enviado com sucesso para ${to}! ID: ${info.messageId}`);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, messageId: info.messageId, response: info.response }));

          } catch (err) {
            console.error('[Hostinger SMTP Server] Erro ao enviar:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    }
  };
}

// Plugin para Endpoints de Checkout Transparente Mercado Pago
function mercadoPagoApiPlugin() {
  return {
    name: 'mercadopago-api-plugin',
    configureServer(server) {
      // 1. Criar PIX Transparente
      server.middlewares.use('/api/mercadopago/create-pix', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const { amount, description, payerEmail, payerName, payerCpf, orderId, token } = data;

            const activeToken = token || 'TEST-4852351940284754-111521-cd8aeace7cdd4827365f1c23063177a9-443850714';

            const nameParts = (payerName || 'Cliente Amoreja').trim().split(' ');
            const firstName = nameParts[0] || 'Cliente';
            const lastName = nameParts.slice(1).join(' ') || 'Amoreja';

            const payload = {
              transaction_amount: parseFloat(parseFloat(amount).toFixed(2)),
              description: description || 'Receita Digital Amoreja Amigurumi',
              payment_method_id: 'pix',
              payer: {
                email: payerEmail || 'cliente@amoreja.com.br',
                first_name: firstName,
                last_name: lastName,
                ...(payerCpf ? {
                  identification: {
                    type: 'CPF',
                    number: payerCpf.replace(/\D/g, '')
                  }
                } : {})
              },
              external_reference: orderId || `order_${Date.now()}`
            };

            const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${activeToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `pix_${orderId || Date.now()}_${Date.now()}`
              },
              body: JSON.stringify(payload)
            });

            const mpData = await mpRes.json();

            if (!mpRes.ok) {
              console.error('[MP API Error]', mpData);
              res.statusCode = mpRes.status;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: mpData.message || 'Erro ao gerar Pix no Mercado Pago', details: mpData }));
            }

            const transactionData = mpData.point_of_interaction?.transaction_data || {};

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({
              success: true,
              payment_id: mpData.id,
              status: mpData.status,
              qr_code: transactionData.qr_code,
              qr_code_base64: transactionData.qr_code_base64,
              ticket_url: transactionData.ticket_url
            }));

          } catch (err) {
            console.error('[MP Server Error]', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      // 2. Checar Status do Pagamento em Tempo Real
      server.middlewares.use('/api/mercadopago/check-status', async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const paymentId = url.searchParams.get('id');
        const token = url.searchParams.get('token') || 'TEST-4852351940284754-111521-cd8aeace7cdd4827365f1c23063177a9-443850714';

        if (!paymentId) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'paymentId required' }));
        }

        try {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const mpData = await mpRes.json();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            status: mpData.status,
            status_detail: mpData.status_detail,
            approved: mpData.status === 'approved'
          }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), emailApiPlugin(), mercadoPagoApiPlugin()],
});

