const nodemailer = require('nodemailer');

const emailUser = 'amoreja@amoreja.com.br';
const emailPass = process.argv[2] || process.env.HOSTINGER_EMAIL_PASS || '';
const toEmail = process.argv[3] || 'amorejaamigurumi@gmail.com';

if (!emailPass) {
  console.log('POR_FAVOR_INFORMAR_SENHA: Para disparar o e-mail real pelo servidor Hostinger, forneça a senha da conta amoreja@amoreja.com.br.');
  process.exit(0);
}

async function sendTest() {
  console.log(`Conectando ao servidor SMTP Hostinger (smtp.hostinger.com:465) com ${emailUser}...`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true, // Porta 465 requer SSL/TLS
    auth: {
      user: emailUser,
      pass: emailPass
    }
  });

  const mailOptions = {
    from: '"Amoreja Amigurumi" <amoreja@amoreja.com.br>',
    to: toEmail,
    subject: '🧶 Teste de Conexão - Amoreja Amigurumi',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #fed7aa; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #ea7458 0%, #d85739 100%); padding: 25px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px;">🧶 Amoreja Amigurumi</h1>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">E-mail de Teste de Conexão SMTP</p>
        </div>
        <div style="padding: 30px 25px; color: #334155; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;">Olá!</p>
          <p>Este é um e-mail de teste enviado com sucesso através do servidor oficial <strong>Hostinger SMTP</strong> (<code>smtp.hostinger.com:465</code>).</p>
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 14px; margin: 20px 0; border-radius: 6px;">
            <strong style="color: #065f46;">✅ Conexão validada com sucesso!</strong>
            <p style="margin: 4px 0 0; font-size: 13px; color: #047857;">O aplicativo Amoreja está configurado para envio e recebimento de e-mails automáticos.</p>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 16px 25px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #64748b;">
          Assinatura:<br/>
          <strong>Amoreja Amigurumi</strong><br/>
          <span style="font-size: 11px; color: #94a3b8;">amoreja.com.br • amoreja@amoreja.com.br</span>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('SUCESSO: E-mail de teste enviado com sucesso!');
    console.log('Message ID:', info.messageId);
    console.log('Resposta do servidor:', info.response);
  } catch (error) {
    console.error('ERRO_AO_ENVIAR:', error.message);
  }
}

sendTest();
