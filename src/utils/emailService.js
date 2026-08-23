import { supabase, isSupabaseConfigured } from '../supabaseClient';

/**
 * emailService.js - Serviço de Envio e Templates de E-mails Automáticos da Amoreja
 * Servidor Hostinger: smtp.hostinger.com (Porta 465 SSL/TLS) | imap.hostinger.com (Porta 993)
 * E-mail: amoreja@amoreja.com.br
 * Assinatura: Amoreja Amigurumi
 */

export const EMAIL_CONFIG_DEFAULT = {
  address: 'amoreja@amoreja.com.br',
  senderName: 'Amoreja Amigurumi',
  signature: 'Amoreja Amigurumi',
  smtpHost: 'smtp.hostinger.com',
  smtpPort: 465,
  imapHost: 'imap.hostinger.com',
  imapPort: 993
};

/**
 * Busca as configurações ativas de e-mail no banco de dados
 */
export async function getActiveEmailConfig() {
  if (!isSupabaseConfigured()) return EMAIL_CONFIG_DEFAULT;

  try {
    const { data } = await supabase
      .from('new_amoreja_settings')
      .select('key, value')
      .in('key', [
        'email_address',
        'email_sender_name',
        'email_signature',
        'email_smtp_host',
        'email_smtp_port',
        'email_notify_order_complete',
        'email_notify_partner_approved',
        'email_notify_partner_sale'
      ]);

    if (!data) return EMAIL_CONFIG_DEFAULT;

    const getVal = (k, defaultVal) => data.find(s => s.key === k)?.value || defaultVal;

    return {
      address: getVal('email_address', EMAIL_CONFIG_DEFAULT.address),
      senderName: getVal('email_sender_name', EMAIL_CONFIG_DEFAULT.senderName),
      signature: getVal('email_signature', EMAIL_CONFIG_DEFAULT.signature),
      smtpHost: getVal('email_smtp_host', EMAIL_CONFIG_DEFAULT.smtpHost),
      smtpPort: parseInt(getVal('email_smtp_port', '465')),
      notifyOrderComplete: getVal('email_notify_order_complete', 'true') === 'true',
      notifyPartnerApproved: getVal('email_notify_partner_approved', 'true') === 'true',
      notifyPartnerSale: getVal('email_notify_partner_sale', 'true') === 'true'
    };
  } catch (err) {
    console.warn('Erro ao carregar configurações de e-mail:', err);
    return EMAIL_CONFIG_DEFAULT;
  }
}

/**
 * Template de Notificação: Pedido Aprovado e Liberação de Receita PDF
 */
export function generateOrderApprovedEmail({ clientName, orderId, recipeTitle, downloadUrl, signature = 'Amoreja Amigurumi' }) {
  return {
    subject: `🎉 Sua receita em PDF foi liberada! - ${recipeTitle}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #fed7aa; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #ea7458 0%, #d85739 100%); padding: 25px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px;">🧶 Amoreja Amigurumi</h1>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Pagamento Confirmado com Sucesso!</p>
        </div>

        <div style="padding: 30px 25px; color: #334155; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;">Olá, <strong>${clientName || 'Artesã'}</strong>!</p>
          <p>Seu pagamento do <strong>Pedido #${orderId.slice(0, 8)}</strong> foi confirmado com sucesso. Sua receita em PDF já está pronta para download imediato!</p>

          <div style="background: #fff7ed; border-left: 4px solid #ea7458; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong style="color: #9a3412; display: block; font-size: 15px;">🧵 ${recipeTitle}</strong>
            <p style="margin: 4px 0 0; font-size: 13px; color: #c2410c;">PDF Digital com passo a passo completo, fotos e lista de materiais.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl || 'https://amoreja.com.br/painel'}" style="background: #ea7458; color: #ffffff; padding: 14px 28px; font-weight: bold; text-decoration: none; border-radius: 8px; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(234, 116, 88, 0.3);">
              📥 Acessar Minha Receita
            </a>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            Você também pode acessar e baixar sua receita a qualquer momento no seu painel em <strong>amoreja.com.br/painel</strong>.
          </p>
        </div>

        <div style="background: #f8fafc; padding: 16px 25px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #64748b;">
          Com carinho,<br/>
          <strong>${signature}</strong><br/>
          <span style="font-size: 11px; color: #94a3b8;">amoreja.com.br • amoreja@amoreja.com.br</span>
        </div>
      </div>
    `
  };
}

/**
 * Template de Notificação: Receita de Parceira Aprovada pelo Admin
 */
export function generatePartnerApprovedRecipeEmail({ partnerName, recipeTitle, storeUrl, signature = 'Amoreja Amigurumi' }) {
  return {
    subject: `✨ Sua receita "${recipeTitle}" foi APROVADA na Amoreja!`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #bbf7d0; border-radius: 12px; overflow: hidden;">
        <div style="background: #059669; padding: 25px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">🎉 Receita Aprovada & Publicada!</h1>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Canal da Parceira • Amoreja</p>
        </div>

        <div style="padding: 25px; color: #334155; line-height: 1.6;">
          <p>Olá, <strong>${partnerName}</strong>!</p>
          <p>Temos uma ótima notícia! Sua receita <strong>"${recipeTitle}"</strong> foi revisada e aprovada pelo Administrador e já está disponível para venda na loja oficial da Amoreja.</p>
          
          <p>Acompanhe suas visualizações, carrinhos em andamento e comissões diretamente no seu <strong>Canal da Parceira</strong>.</p>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${storeUrl || 'https://amoreja.com.br/parceiro'}" style="background: #059669; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
              📊 Acessar Meu Painel de Vendas
            </a>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #64748b;">
          Atenciosamente,<br/>
          <strong>${signature}</strong>
        </div>
      </div>
    `
  };
}

/**
 * Template de Notificação: Nova Venda Realizada para a Parceira
 */
export function generatePartnerNewSaleEmail({ partnerName, recipeTitle, saleAmount, commissionAmount, signature = 'Amoreja Amigurumi' }) {
  return {
    subject: `💰 Você fez uma nova venda! Comissão: R$ ${parseFloat(commissionAmount).toFixed(2)}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #bae6fd; border-radius: 12px; overflow: hidden;">
        <div style="background: #0284c7; padding: 25px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">💸 Nova Venda Realizada!</h1>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Comissão registrada no seu extrato</p>
        </div>

        <div style="padding: 25px; color: #334155; line-height: 1.6;">
          <p>Parabéns, <strong>${partnerName}</strong>!</p>
          <p>Uma cliente acabou de comprar sua receita <strong>"${recipeTitle}"</strong>.</p>
          
          <div style="background: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Valor da Venda:</span>
              <strong>R$ ${parseFloat(saleAmount).toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; color: #0369a1; font-size: 16px;">
              <span>Sua Comissão:</span>
              <strong style="color: #059669;">R$ ${parseFloat(commissionAmount).toFixed(2)}</strong>
            </div>
          </div>

          <p style="font-size: 13.5px; color: #64748b;">
            O repasse será processado conforme seus dados bancários cadastrados no Canal da Parceira.
          </p>
        </div>

        <div style="background: #f8fafc; padding: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 13px; color: #64748b;">
          Boas vendas,<br/>
          <strong>${signature}</strong>
        </div>
      </div>
    `
  };
}

/**
 * Template de Notificação: Feedback do Administrador na Matéria do Jornal
 */
export function generateJournalFeedbackEmail({ authorName, articleTitle, status, feedback, signature = 'Amoreja Amigurumi' }) {
  const isApproved = status === 'approved';
  const color = isApproved ? '#059669' : '#ea7458';
  const statusText = isApproved ? 'APROVADA' : 'com Pendências';

  return {
    subject: `📰 Atualização na sua matéria: "${articleTitle}"`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid ${color}40; border-radius: 12px; overflow: hidden;">
        <div style="background: ${color}; padding: 25px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">Sua matéria foi revisada!</h1>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Jornal Amoreja</p>
        </div>

        <div style="padding: 25px; color: #334155; line-height: 1.6;">
          <p>Olá, <strong>${authorName}</strong>!</p>
          <p>O Administrador avaliou sua matéria <strong>"${articleTitle}"</strong> e o status atualizado é: <strong>${statusText}</strong>.</p>
          
          ${feedback ? `
          <div style="background: #f8fafc; border-left: 4px solid ${color}; padding: 16px; margin: 20px 0;">
            <strong style="display: block; font-size: 14px; color: #475569; margin-bottom: 5px;">Comentário do Administrador:</strong>
            <p style="margin: 0; font-style: italic; color: #334155;">"${feedback}"</p>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 25px 0;">
            <a href="https://amoreja.com.br/colunista" style="background: ${color}; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
              Acessar Área do Colunista
            </a>
          </div>
        </div>
      </div>
    `
  };
}

/**
 * Template de Notificação: Datas da Matéria
 */
export function generateJournalDateWarningEmail({ authorName, articleTitle, type, date, signature = 'Amoreja Amigurumi' }) {
  const isStart = type === 'start';
  const actionText = isStart ? 'entrará no ar amanhã' : 'sairá do ar (arquivada) amanhã';
  
  return {
    subject: `📰 Aviso do Jornal: "${articleTitle}" ${actionText}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden;">
        <div style="background: #475569; padding: 25px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px;">Aviso Importante do Jornal</h1>
        </div>

        <div style="padding: 25px; color: #334155; line-height: 1.6;">
          <p>Olá, <strong>${authorName}</strong>!</p>
          <p>Gostaríamos de avisar que a sua matéria <strong>"${articleTitle}"</strong> ${actionText} (${date}).</p>
          
          <p>Se precisar fazer algum ajuste na validade ou no conteúdo, acesse seu painel e edite a matéria (ela voltará para revisão).</p>

          <div style="text-align: center; margin: 25px 0;">
            <a href="https://amoreja.com.br/colunista" style="background: #475569; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
              Acessar Área do Colunista
            </a>
          </div>
        </div>
      </div>
    `
  };
}

/**
 * Função utilitária para registrar log ou disparar envio
 */
export async function sendAppNotificationEmail({ to, subject, html, category = 'Automático' }) {
  console.log(`[Hostinger SMTP: smtp.hostinger.com:465] Enviando e-mail para: ${to} | Assunto: ${subject}`);
  
  const emailLogItem = {
    id: `email_auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    folder: 'sent',
    from: 'Amoreja Amigurumi <amoreja@amoreja.com.br>',
    to,
    subject,
    date: new Date().toISOString(),
    is_read: true,
    is_starred: false,
    type: 'automatic',
    category,
    snippet: html.replace(/<[^>]*>?/gm, '').slice(0, 120),
    body: html,
    attachments: []
  };

  // Salva no histórico do Webmail
  try {
    const existing = JSON.parse(localStorage.getItem('amoreja_emails') || '[]');
    localStorage.setItem('amoreja_emails', JSON.stringify([emailLogItem, ...existing]));

    if (isSupabaseConfigured()) {
      await supabase.from('new_amoreja_settings').upsert({
        key: `email_log_${emailLogItem.id}`,
        value: JSON.stringify(emailLogItem)
      }, { onConflict: 'key' });
    }
  } catch (_) {}

  // Disparo Real via API Server local / Vite Middleware
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        html,
        user: 'amoreja@amoreja.com.br',
        password: '10207597Rdv*',
        smtpHost: 'smtp.hostinger.com',
        smtpPort: 465
      })
    });

    const json = await res.json();
    if (res.ok && json.success) {
      console.log('E-mail disparado com sucesso via Hostinger SMTP!', json);
      return { success: true, data: json };
    }
  } catch (err) {
    console.warn('Erro ao chamar /api/send-email:', err.message);
  }

  // Fallback se houver Edge Function configurada no Supabase
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to, subject, html, from: 'amoreja@amoreja.com.br', fromName: 'Amoreja Amigurumi' }
      });
      if (!error) return { success: true, data };
    }
  } catch (_) {}

  return { success: true, simulated: true };
}
