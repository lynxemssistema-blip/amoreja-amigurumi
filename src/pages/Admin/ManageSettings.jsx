import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { Save, Settings as SettingsIcon, CreditCard, Info, ExternalLink, Zap, Mail, Server, ShieldCheck, CheckCircle2, Send } from 'lucide-react';
import './ManageSettings.css';

export default function ManageSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Email Hostinger Settings
  const [emailAddress, setEmailAddress] = useState('amoreja@amoreja.com.br');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailSenderName, setEmailSenderName] = useState('Amoreja Amigurumi');
  const [emailSignature, setEmailSignature] = useState('Amoreja Amigurumi');
  const [smtpHost, setSmtpHost] = useState('smtp.hostinger.com');
  const [smtpPort, setSmtpPort] = useState('465');
  const [imapHost, setImapHost] = useState('imap.hostinger.com');
  const [imapPort, setImapPort] = useState('993');
  const [notifyOrderComplete, setNotifyOrderComplete] = useState(true);
  const [notifyPartnerApproved, setNotifyPartnerApproved] = useState(true);
  const [notifyPartnerSale, setNotifyPartnerSale] = useState(true);
  const [emailFeedback, setEmailFeedback] = useState(null);

  // Test Email State
  const [testRecipient, setTestRecipient] = useState('amorejaamigurumi@gmail.com');
  const [sendingTest, setSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('new_amoreja_settings')
        .select('key, value')
        .in('key', [
          'email_address',
          'email_password',
          'email_sender_name',
          'email_signature',
          'email_smtp_host',
          'email_smtp_port',
          'email_imap_host',
          'email_imap_port',
          'email_notify_order_complete',
          'email_notify_partner_approved',
          'email_notify_partner_sale'
        ]);
        
      if (error) throw error;
      
      if (data) {
        const getVal = (k, defaultVal = '') => data.find(s => s.key === k)?.value || defaultVal;
        
        setEmailAddress(getVal('email_address', 'amoreja@amoreja.com.br'));
        setEmailPassword(getVal('email_password', ''));
        setEmailSenderName(getVal('email_sender_name', 'Amoreja Amigurumi'));
        setEmailSignature(getVal('email_signature', 'Amoreja Amigurumi'));
        setSmtpHost(getVal('email_smtp_host', 'smtp.hostinger.com'));
        setSmtpPort(getVal('email_smtp_port', '465'));
        setImapHost(getVal('email_imap_host', 'imap.hostinger.com'));
        setImapPort(getVal('email_imap_port', '993'));
        setNotifyOrderComplete(getVal('email_notify_order_complete', 'true') === 'true');
        setNotifyPartnerApproved(getVal('email_notify_partner_approved', 'true') === 'true');
        setNotifyPartnerSale(getVal('email_notify_partner_sale', 'true') === 'true');
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      alert("Configurações salvas localmente no Modo Demo.");
      return;
    }
    
    setSaving(true);
    setEmailFeedback(null);
    try {
      const settingsToSave = [
        { key: 'email_address', value: emailAddress },
        { key: 'email_password', value: emailPassword },
        { key: 'email_sender_name', value: emailSenderName },
        { key: 'email_signature', value: emailSignature },
        { key: 'email_smtp_host', value: smtpHost },
        { key: 'email_smtp_port', value: smtpPort },
        { key: 'email_imap_host', value: imapHost },
        { key: 'email_imap_port', value: imapPort },
        { key: 'email_notify_order_complete', value: notifyOrderComplete.toString() },
        { key: 'email_notify_partner_approved', value: notifyPartnerApproved.toString() },
        { key: 'email_notify_partner_sale', value: notifyPartnerSale.toString() }
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from('new_amoreja_settings')
          .upsert({ key: setting.key, value: setting.value }, { onConflict: 'key' });
      }
      
      setEmailFeedback({ type: 'success', text: 'Configurações de pagamento e e-mails automáticos salvas com sucesso!' });
      setTimeout(() => setEmailFeedback(null), 4000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      setEmailFeedback({ type: 'error', text: 'Erro ao salvar as configurações: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      alert("Por favor, informe o e-mail de destino.");
      return;
    }
    
    setSendingTest(true);
    setTestFeedback(null);

    try {
      const activePassword = emailPassword || '10207597Rdv*';

      // Salva antes de testar se preenchido
      if (emailPassword) {
        await supabase
          .from('new_amoreja_settings')
          .upsert({ key: 'email_password', value: emailPassword }, { onConflict: 'key' });
      }

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testRecipient,
          subject: '🧶 Teste de Conexão - Amoreja Amigurumi',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6; border: 1px solid #fed7aa; border-radius: 12px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #ea7458 0%, #d85739 100%); padding: 25px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px;">🧶 Amoreja Amigurumi</h1>
                <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">E-mail de Teste de Conexão SMTP</p>
              </div>
              <div style="padding: 25px;">
                <p>Olá!</p>
                <p>Este é um e-mail de teste disparado em tempo real pelo painel de controle da <strong>Amoreja Amigurumi</strong> usando o servidor <strong>Hostinger SMTP</strong> (<code>smtp.hostinger.com:465</code>).</p>
                <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; margin: 16px 0; border-radius: 6px;">
                  <strong style="color: #065f46;">✅ Servidor SMTP conectado e funcionando perfeitamente!</strong>
                </div>
                <p style="margin-top: 25px; font-size: 13px; color: #64748b;">
                  Assinatura:<br/>
                  <strong>Amoreja Amigurumi</strong><br/>
                  <span style="font-size: 11px; color: #94a3b8;">amoreja.com.br • amoreja@amoreja.com.br</span>
                </p>
              </div>
            </div>
          `,
          user: emailAddress || 'amoreja@amoreja.com.br',
          password: activePassword,
          smtpHost: smtpHost || 'smtp.hostinger.com',
          smtpPort: smtpPort || 465
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setTestFeedback({
          type: 'success',
          text: `🎉 E-mail de teste entregue com sucesso para ${testRecipient}! (ID: ${json.messageId || 'OK'})`
        });
      } else {
        throw new Error(json.error || 'Falha na resposta do servidor.');
      }

    } catch (err) {
      setTestFeedback({
        type: 'error',
        text: 'Erro ao enviar e-mail de teste: ' + err.message
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) return <div className="admin-loading"><div className="loader"></div></div>;

  return (
    <div className="manage-settings-container">
      <div className="admin-page-header">
        <div>
          <h2>Configurações Gerais</h2>
          <p>Ajuste os parâmetros de funcionamento da loja.</p>
        </div>
      </div>

      {/* SEÇÃO: FORMAS DE PAGAMENTO MERCADO PAGO / CHECKOUT TRANSPARENTE */}
      <div className="product-form-card" style={{ maxWidth: '600px', borderLeft: '4px solid #009ee3' }}>
        <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3><CreditCard size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom', color: '#009ee3'}}/> Formas de Pagamento (Mercado Pago)</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>PIX Instantâneo e Cartão de Crédito integrados com baixa 100% automática.</p>
          </div>
          <Link to="/admin/mercadopago" className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}>
            Configurar Mercado Pago →
          </Link>
        </div>
      </div>

      {/* SEÇÃO: SERVIDOR DE E-MAIL HOSTINGER (SMTP/IMAP) & NOTIFICAÇÕES AUTOMÁTICAS */}
      <div className="product-form-card" style={{ maxWidth: '600px', marginTop: '24px', borderLeft: '4px solid #ea7458' }}>
        <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3><Mail size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom', color: '#ea7458'}}/> Servidor de E-mail Hostinger & Notificações</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Configure o envio e recebimento de e-mails automáticos do app.</p>
          </div>
          <span style={{ fontSize: '12px', background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>Hostinger IMAP/SMTP</span>
        </div>

        {emailFeedback && (
          <div className={`alert ${emailFeedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ margin: '14px 0' }}>
            {emailFeedback.text}
          </div>
        )}

        <form onSubmit={saveSettings} className="admin-form" style={{ marginTop: '16px' }}>
          <div className="form-grid">
            
            <div className="form-group col-span-2">
              <label className="form-label">Endereço de E-mail do Sistema *</label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="amoreja@amoreja.com.br"
                className="form-control"
                required
              />
            </div>

            <div className="form-group col-span-2">
              <label className="form-label">Senha da Caixa Postal (Hostinger)</label>
              <input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="Digite a senha do e-mail"
                className="form-control"
              />
              <small style={{ color: '#64748b', marginTop: '4px' }}>Armazenada com segurança no banco de dados para autenticação SMTP/IMAP.</small>
            </div>

            <div className="form-group">
              <label className="form-label">Nome do Remetente</label>
              <input
                type="text"
                value={emailSenderName}
                onChange={(e) => setEmailSenderName(e.target.value)}
                placeholder="Amoreja Amigurumi"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assinatura Oficial do E-mail</label>
              <input
                type="text"
                value={emailSignature}
                onChange={(e) => setEmailSignature(e.target.value)}
                placeholder="Amoreja Amigurumi"
                className="form-control"
              />
            </div>

            {/* Configurações de Servidor */}
            <div className="form-group col-span-2" style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
              <strong style={{ fontSize: '13.5px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Server size={15} color="#ea7458" /> Parâmetros de Conexão Hostinger
              </strong>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>SMTP Saída (Host)</label>
                  <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="form-control" style={{ fontSize: '12.5px' }} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Porta SMTP (SSL/TLS)</label>
                  <input type="text" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} className="form-control" style={{ fontSize: '12.5px' }} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>IMAP Entrada (Host)</label>
                  <input type="text" value={imapHost} onChange={(e) => setImapHost(e.target.value)} className="form-control" style={{ fontSize: '12.5px' }} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Porta IMAP (SSL/TLS)</label>
                  <input type="text" value={imapPort} onChange={(e) => setImapPort(e.target.value)} className="form-control" style={{ fontSize: '12.5px' }} />
                </div>
              </div>
            </div>

            {/* Gatilhos de Notificações Automáticas */}
            <div className="form-group col-span-2" style={{ marginTop: '10px' }}>
              <strong style={{ fontSize: '13.5px', color: '#1e293b', display: 'block', marginBottom: '10px' }}>
                Gatilhos de Envio Automático:
              </strong>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label className="custom-toggle-label" style={{ fontSize: '13px' }}>
                  <input 
                    type="checkbox" 
                    className="custom-toggle-input"
                    checked={notifyOrderComplete}
                    onChange={(e) => setNotifyOrderComplete(e.target.checked)}
                  />
                  <div className="custom-toggle-slider"></div>
                  <span className="toggle-text">📩 Enviar confirmação de compra com link do PDF após pagamento aprovado</span>
                </label>

                <label className="custom-toggle-label" style={{ fontSize: '13px' }}>
                  <input 
                    type="checkbox" 
                    className="custom-toggle-input"
                    checked={notifyPartnerApproved}
                    onChange={(e) => setNotifyPartnerApproved(e.target.checked)}
                  />
                  <div className="custom-toggle-slider"></div>
                  <span className="toggle-text">📩 Notificar a parceira quando a receita dela for APROVADA na loja</span>
                </label>

                <label className="custom-toggle-label" style={{ fontSize: '13px' }}>
                  <input 
                    type="checkbox" 
                    className="custom-toggle-input"
                    checked={notifyPartnerSale}
                    onChange={(e) => setNotifyPartnerSale(e.target.checked)}
                  />
                  <div className="custom-toggle-slider"></div>
                  <span className="toggle-text">📩 Notificar a parceira quando houver uma nova venda de sua receita com a comissão gerada</span>
                </label>
              </div>
            </div>

          </div>

          <div className="form-actions" style={{ marginTop: '20px' }}>
            <button 
              type="submit" 
              disabled={saving}
              className="btn btn-primary"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar Configurações de E-mail'}
            </button>
          </div>
        </form>

        {/* Caixa de Disparo de E-mail de Teste */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Send size={15} color="#ea7458" /> Testar Envio de E-mail em Tempo Real
          </h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: '#64748b' }}>
            Envie uma mensagem de teste para verificar a comunicação com o servidor SMTP da Hostinger.
          </p>

          {testFeedback && (
            <div className={`alert ${testFeedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '12px', fontSize: '13px' }}>
              {testFeedback.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input 
              type="email" 
              value={testRecipient} 
              onChange={(e) => setTestRecipient(e.target.value)} 
              placeholder="Digite o e-mail de teste (ex: amorejaamigurumi@gmail.com)"
              className="form-control"
              style={{ flex: 1, minWidth: '220px', fontSize: '13px' }}
            />
            <button 
              type="button" 
              onClick={handleSendTestEmail} 
              disabled={sendingTest}
              className="btn btn-primary"
              style={{ background: '#0284c7', borderColor: '#0284c7', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Send size={14} />
              {sendingTest ? 'Enviando...' : 'Enviar E-mail de Teste'}
            </button>
          </div>
        </div>
      </div>

      {/* Card de Integração com Mercado Pago */}
      <div className="product-form-card" style={{ maxWidth: '600px', marginTop: '24px', borderLeft: '4px solid #009ee3' }}>
        <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3><Zap size={18} style={{marginRight: '8px', verticalAlign: 'text-bottom', color: '#009ee3'}}/> Integração Mercado Pago</h3>
          <span style={{ fontSize: '12px', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>Automatizado</span>
        </div>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '12px 0 16px 0', lineHeight: 1.5 }}>
          Configure suas chaves de API (Public Key e Access Token), ative a baixa automática de PIX e pagamentos por Cartão de Crédito.
        </p>
        <Link to="/admin/mercadopago" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span>Acessar Painel Mercado Pago</span>
          <ExternalLink size={16} />
        </Link>
      </div>
    </div>
  );
}
