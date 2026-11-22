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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), emailApiPlugin()],
  server: {
    port: 5174,
    proxy: {
      '/supabase-rest': {
        target: 'https://supabase-supabaseamoreja.1cnep6.easypanel.host',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-rest/, '/rest/v1'),
        headers: {
          Host: 'supabase-supabaseamoreja.1cnep6.easypanel.host'
        }
      },
      '/supabase-auth': {
        target: 'https://supabase-supabaseamoreja.1cnep6.easypanel.host',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-auth/, '/auth/v1'),
        headers: {
          Host: 'supabase-supabaseamoreja.1cnep6.easypanel.host'
        }
      }
    }
  }
});

