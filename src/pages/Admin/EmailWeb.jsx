import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { 
  Inbox, 
  Send, 
  Star, 
  Trash2, 
  Plus, 
  Search, 
  RefreshCw, 
  Paperclip, 
  Image as ImageIcon, 
  Download, 
  ArrowLeft, 
  Reply, 
  Forward, 
  X, 
  CheckCircle2, 
  Clock, 
  Mail, 
  Tag, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { sendAppNotificationEmail } from '../../utils/emailService';
import './EmailWeb.css';

// E-mails iniciais pré-carregados para demonstração e histórico
const INITIAL_MOCK_EMAILS = [
  {
    id: 'em-1',
    folder: 'sent',
    from: 'Amoreja Amigurumi <amoreja@amoreja.com.br>',
    to: 'amorejaamigurumi@gmail.com',
    subject: '🧶 Teste de Conexão - Amoreja Amigurumi',
    date: new Date().toISOString(),
    is_read: true,
    is_starred: true,
    type: 'automatic',
    category: 'Teste de Servidor',
    snippet: 'Este é um e-mail de teste enviado com sucesso através do servidor oficial Hostinger SMTP...',
    body: `
      <p>Olá!</p>
      <p>Este é um e-mail de teste enviado com sucesso através do servidor oficial <strong>Hostinger SMTP</strong> (<code>smtp.hostinger.com:465</code>).</p>
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 14px; margin: 16px 0; border-radius: 6px;">
        <strong style="color: #065f46;">✅ Conexão validada com sucesso!</strong>
        <p style="margin: 4px 0 0; font-size: 13px; color: #047857;">O aplicativo Amoreja está configurado para envio e recebimento de e-mails automáticos.</p>
      </div>
      <p>Assinatura:<br/><strong>Amoreja Amigurumi</strong></p>
    `,
    attachments: []
  },
  {
    id: 'em-2',
    folder: 'sent',
    from: 'Amoreja Amigurumi <amoreja@amoreja.com.br>',
    to: 'cliente@exemplo.com',
    subject: '🎉 Sua receita em PDF foi liberada! - Gigi Love',
    date: new Date(Date.now() - 3600000 * 4).toISOString(),
    is_read: true,
    is_starred: false,
    type: 'automatic',
    category: 'Pedido #98231',
    snippet: 'Seu pagamento do Pedido #98231 foi confirmado com sucesso. Sua receita em PDF já está pronta...',
    body: `
      <p>Olá, <strong>Mariana Silva</strong>!</p>
      <p>Seu pagamento do <strong>Pedido #98231</strong> foi confirmado com sucesso. Sua receita em PDF já está pronta para download imediato!</p>
      <div style="background: #fff7ed; border-left: 4px solid #ea7458; padding: 14px; margin: 16px 0; border-radius: 6px;">
        <strong style="color: #9a3412;">🧵 Gigi Love - Girafinha com Óculos</strong>
        <p style="margin: 4px 0 0; font-size: 13px; color: #c2410c;">PDF Digital com passo a passo completo, fotos e lista de materiais.</p>
      </div>
      <p>Com carinho,<br/><strong>Amoreja Amigurumi</strong></p>
    `,
    attachments: [
      { name: 'receita_gigi_love.pdf', size: '2.4 MB', type: 'application/pdf' }
    ]
  },
  {
    id: 'em-3',
    folder: 'inbox',
    from: 'Dúvidas e Suporte <cliente.croche@gmail.com>',
    to: 'amoreja@amoreja.com.br',
    subject: 'Dúvida sobre a receita do Ursinho Soninho',
    date: new Date(Date.now() - 3600000 * 12).toISOString(),
    is_read: false,
    is_starred: true,
    type: 'manual',
    category: 'Suporte ao Cliente',
    snippet: 'Olá equipe Amoreja! Gostaria de saber qual número de agulha fica melhor para usar com o fio Amigurumi Soft...',
    body: `
      <p>Olá equipe Amoreja!</p>
      <p>Comprei a receita do <strong>Ursinho Soninho</strong> ontem e estou amando o tutorial!</p>
      <p>Gostaria de saber qual número de agulha fica melhor para usar com o fio Amigurumi Soft para a peça não ficar com pontos muito abertos.</p>
      <p>Muito obrigada pelo trabalho lindo de vocês!</p>
      <p>Atenciosamente,<br/><strong>Clara Mendes</strong></p>
    `,
    attachments: []
  }
];

export default function EmailWeb() {
  const [emails, setEmails] = useState([]);
  const [activeFolder, setActiveFolder] = useState('inbox'); // 'inbox' | 'sent' | 'starred' | 'trash'
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal de Composição
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [composeFeedback, setComposeFeedback] = useState(null);

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        const stored = localStorage.getItem('amoreja_emails');
        if (stored) {
          setEmails(JSON.parse(stored));
        } else {
          setEmails(INITIAL_MOCK_EMAILS);
          localStorage.setItem('amoreja_emails', JSON.stringify(INITIAL_MOCK_EMAILS));
        }
        setLoading(false);
        return;
      }

      // Buscar do Supabase (tabela ou fallback settings)
      const { data: settingsData } = await supabase
        .from('new_amoreja_settings')
        .select('key, value')
        .like('key', 'email_log_%');

      let fetched = [];
      if (settingsData && settingsData.length > 0) {
        fetched = settingsData.map(s => JSON.parse(s.value));
      }

      // Mescla com iniciais se lista vazia
      if (fetched.length === 0) {
        fetched = INITIAL_MOCK_EMAILS;
      }

      setEmails(fetched.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error('Erro ao carregar e-mails:', err);
      setEmails(INITIAL_MOCK_EMAILS);
    } finally {
      setLoading(false);
    }
  };

  const saveEmailsState = async (newEmailsList) => {
    setEmails(newEmailsList);
    localStorage.setItem('amoreja_emails', JSON.stringify(newEmailsList));

    if (isSupabaseConfigured()) {
      try {
        // Salva os últimos e-mails nos settings como histórico persistente
        for (const em of newEmailsList.slice(0, 30)) {
          await supabase
            .from('new_amoreja_settings')
            .upsert({
              key: `email_log_${em.id}`,
              value: JSON.stringify(em)
            }, { onConflict: 'key' });
        }
      } catch (_) {}
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!composeTo || !composeSubject) {
      alert("Por favor, preencha o destinatário e o assunto.");
      return;
    }

    setSending(true);
    setComposeFeedback(null);

    try {
      const fullHtmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
          <div style="padding: 20px 0;">
            ${composeBody.replace(/\n/g, '<br/>')}
          </div>
          <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
            Assinatura:<br/>
            <strong>Amoreja Amigurumi</strong><br/>
            <span style="font-size: 11px; color: #94a3b8;">amoreja.com.br • amoreja@amoreja.com.br</span>
          </div>
        </div>
      `;

      // Dispara o envio
      await sendAppNotificationEmail({
        to: composeTo,
        subject: composeSubject,
        html: fullHtmlBody
      });

      // Cria o registro na Caixa de Saída / Enviados
      const newSentEmail = {
        id: `email_${Date.now()}`,
        folder: 'sent',
        from: 'Amoreja Amigurumi <amoreja@amoreja.com.br>',
        to: composeTo,
        subject: composeSubject,
        date: new Date().toISOString(),
        is_read: true,
        is_starred: false,
        type: 'manual',
        category: 'Manual',
        snippet: composeBody.slice(0, 100),
        body: fullHtmlBody,
        attachments: composeAttachments
      };

      const updated = [newSentEmail, ...emails];
      await saveEmailsState(updated);

      setComposeFeedback({ type: 'success', text: 'E-mail enviado com sucesso pelo servidor Hostinger!' });
      
      setTimeout(() => {
        setIsComposeOpen(false);
        setComposeTo('');
        setComposeSubject('');
        setComposeBody('');
        setComposeAttachments([]);
        setComposeFeedback(null);
        setActiveFolder('sent');
        setSelectedEmail(newSentEmail);
      }, 1500);

    } catch (err) {
      setComposeFeedback({ type: 'error', text: 'Erro ao enviar e-mail: ' + err.message });
    } finally {
      setSending(false);
    }
  };

  const handleToggleStar = (emailId, e) => {
    e.stopPropagation();
    const updated = emails.map(em => em.id === emailId ? { ...em, is_starred: !em.is_starred } : em);
    saveEmailsState(updated);
    if (selectedEmail?.id === emailId) {
      setSelectedEmail({ ...selectedEmail, is_starred: !selectedEmail.is_starred });
    }
  };

  const handleMoveToTrash = (emailId, e) => {
    if (e) e.stopPropagation();
    const updated = emails.map(em => em.id === emailId ? { ...em, folder: 'trash' } : em);
    saveEmailsState(updated);
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null);
    }
  };

  const handleSelectEmail = (em) => {
    const updated = emails.map(item => item.id === em.id ? { ...item, is_read: true } : item);
    saveEmailsState(updated);
    setSelectedEmail({ ...em, is_read: true });
  };

  const handleReply = (em) => {
    setComposeTo(em.from.includes('<') ? em.from.split('<')[1].replace('>', '') : em.from);
    setComposeSubject(em.subject.startsWith('Re:') ? em.subject : `Re: ${em.subject}`);
    setComposeBody(`\n\n--- Mensagem Original ---\nDe: ${em.from}\nData: ${new Date(em.date).toLocaleString('pt-BR')}\nAssunto: ${em.subject}\n\n`);
    setIsComposeOpen(true);
  };

  const handleForward = (em) => {
    setComposeTo('');
    setComposeSubject(em.subject.startsWith('Fwd:') ? em.subject : `Fwd: ${em.subject}`);
    setComposeBody(`\n\n--- Mensagem Encaminhada ---\nDe: ${em.from}\nData: ${new Date(em.date).toLocaleString('pt-BR')}\nAssunto: ${em.subject}\n\n${em.snippet}`);
    setIsComposeOpen(true);
  };

  // Filtros
  const filteredEmails = emails.filter(em => {
    if (activeFolder === 'starred') {
      if (!em.is_starred) return false;
    } else {
      if (em.folder !== activeFolder) return false;
    }

    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    return (
      (em.subject && em.subject.toLowerCase().includes(term)) ||
      (em.from && em.from.toLowerCase().includes(term)) ||
      (em.to && em.to.toLowerCase().includes(term)) ||
      (em.snippet && em.snippet.toLowerCase().includes(term))
    );
  });

  const countInbox = emails.filter(e => e.folder === 'inbox' && !e.is_read).length;
  const countSent = emails.filter(e => e.folder === 'sent').length;
  const countStarred = emails.filter(e => e.is_starred).length;

  return (
    <div className="email-web-container animate-fade-in">
      
      {/* 1. Sidebar de Pastas */}
      <aside className="email-sidebar">
        <button 
          onClick={() => { setIsComposeOpen(true); setComposeFeedback(null); }} 
          className="email-compose-btn"
        >
          <Plus size={18} /> Escrever E-mail
        </button>

        <div className="email-folders-list">
          <button 
            className={`email-folder-item ${activeFolder === 'inbox' ? 'active' : ''}`}
            onClick={() => { setActiveFolder('inbox'); setSelectedEmail(null); }}
          >
            <span className="email-folder-label">
              <Inbox size={18} /> Caixa de Entrada
            </span>
            {countInbox > 0 && <span className="email-folder-count">{countInbox}</span>}
          </button>

          <button 
            className={`email-folder-item ${activeFolder === 'sent' ? 'active' : ''}`}
            onClick={() => { setActiveFolder('sent'); setSelectedEmail(null); }}
          >
            <span className="email-folder-label">
              <Send size={18} /> Enviados (Saída)
            </span>
            <span className="email-folder-count">{countSent}</span>
          </button>

          <button 
            className={`email-folder-item ${activeFolder === 'starred' ? 'active' : ''}`}
            onClick={() => { setActiveFolder('starred'); setSelectedEmail(null); }}
          >
            <span className="email-folder-label">
              <Star size={18} /> Favoritos
            </span>
            {countStarred > 0 && <span className="email-folder-count">{countStarred}</span>}
          </button>

          <button 
            className={`email-folder-item ${activeFolder === 'trash' ? 'active' : ''}`}
            onClick={() => { setActiveFolder('trash'); setSelectedEmail(null); }}
          >
            <span className="email-folder-label">
              <Trash2 size={18} /> Lixeira
            </span>
          </button>
        </div>

        {/* Informações da Conta */}
        <div className="email-account-badge">
          <strong>amoreja@amoreja.com.br</strong>
          <span style={{ color: '#64748b' }}>Servidor Hostinger SSL</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: 'bold', marginTop: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            Conectado
          </div>
        </div>
      </aside>

      {/* 2. Coluna de Lista de Mensagens */}
      <section className="email-list-column">
        <div className="email-list-header">
          <div className="email-list-title-row">
            <h3>
              {activeFolder === 'inbox' && '📥 Caixa de Entrada'}
              {activeFolder === 'sent' && '📤 Enviados (Caixa de Saída)'}
              {activeFolder === 'starred' && '⭐ Mensagens Favoritas'}
              {activeFolder === 'trash' && '🗑️ Lixeira'}
            </h3>
            <button 
              onClick={loadEmails} 
              className="email-action-icon-btn" 
              title="Atualizar Caixa Postal"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="email-search-input-wrap">
            <Search size={15} className="email-search-icon" />
            <input 
              type="text"
              placeholder="Buscar e-mails por assunto, nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="email-search-input"
            />
          </div>
        </div>

        <div className="email-items-scroll">
          {filteredEmails.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
              <Mail size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>Nenhum e-mail nesta pasta.</p>
            </div>
          ) : (
            filteredEmails.map((em) => (
              <div 
                key={em.id}
                onClick={() => handleSelectEmail(em)}
                className={`email-preview-item ${selectedEmail?.id === em.id ? 'selected' : ''} ${!em.is_read ? 'unread' : ''}`}
              >
                <div className="email-preview-header">
                  <span className="email-preview-sender">
                    <button 
                      onClick={(e) => handleToggleStar(em.id, e)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: em.is_starred ? '#f59e0b' : '#cbd5e1' }}
                    >
                      <Star size={15} fill={em.is_starred ? '#f59e0b' : 'none'} />
                    </button>
                    {activeFolder === 'sent' ? `Para: ${em.to}` : em.from.split('<')[0]}
                  </span>
                  <span className="email-preview-date">
                    {new Date(em.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>

                <div className="email-preview-subject">
                  {em.subject}
                </div>

                <div className="email-preview-snippet">
                  {em.snippet}
                </div>

                {em.type === 'automatic' ? (
                  <span className="email-tag-pill email-tag-auto">
                    ⚡ Automático • {em.category || 'Sistema'}
                  </span>
                ) : (
                  <span className="email-tag-pill email-tag-manual">
                    ✍️ Manual
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* 3. Coluna de Visualização / Leitor de E-mail */}
      <section className="email-view-column">
        {selectedEmail ? (
          <>
            <div className="email-view-header">
              <div style={{ flex: 1 }}>
                <h2 className="email-view-subject">{selectedEmail.subject}</h2>
                <div className="email-view-meta-row">
                  <div>
                    <strong>De:</strong> {selectedEmail.from}
                  </div>
                  <div>
                    <strong>Para:</strong> {selectedEmail.to}
                  </div>
                  <div>
                    <strong>Data:</strong> {new Date(selectedEmail.date).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              <div className="email-view-actions">
                <button onClick={() => handleReply(selectedEmail)} className="email-action-icon-btn" title="Responder">
                  <Reply size={16} />
                </button>
                <button onClick={() => handleForward(selectedEmail)} className="email-action-icon-btn" title="Encaminhar">
                  <Forward size={16} />
                </button>
                <button onClick={() => handleMoveToTrash(selectedEmail.id)} className="email-action-icon-btn" title="Mover para Lixeira">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Corpo do E-mail */}
            <div className="email-view-body">
              <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
            </div>

            {/* Anexos */}
            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div className="email-attachments-section">
                <strong style={{ fontSize: '13px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Paperclip size={15} /> Anexos ({selectedEmail.attachments.length}):
                </strong>
                <div style={{ marginTop: '8px' }}>
                  {selectedEmail.attachments.map((att, idx) => (
                    <span key={idx} className="email-attachment-chip">
                      <FileText size={14} color="#ea7458" />
                      <span>{att.name}</span>
                      <small style={{ color: '#64748b' }}>({att.size || 'Arquivo'})</small>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="email-view-empty">
            <Mail size={56} style={{ opacity: 0.3, marginBottom: '14px' }} />
            <h3 style={{ margin: '0 0 6px 0', color: '#64748b', fontSize: '18px' }}>Selecione um e-mail para ler</h3>
            <p style={{ margin: 0, fontSize: '14px', maxWidth: '300px' }}>
              Aqui você pode responder clientes, enviar e-mails com anexos e acompanhar todos os envios automáticos do app.
            </p>
          </div>
        )}
      </section>

      {/* 4. Modal Flutuante de Composição de E-mail */}
      {isComposeOpen && (
        <div className="email-compose-modal animate-slide-up">
          <div className="email-compose-header">
            <h4><Mail size={16} /> Nova Mensagem • Amoreja Amigurumi</h4>
            <button 
              onClick={() => setIsComposeOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>

          {composeFeedback && (
            <div className={`alert ${composeFeedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ margin: '12px 18px 0', fontSize: '13px' }}>
              {composeFeedback.text}
            </div>
          )}

          <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div className="email-compose-body">
              <div>
                <input 
                  type="email"
                  placeholder="Para (Destinatário: ex: cliente@gmail.com)"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="email-compose-input"
                  required
                />
              </div>

              <div>
                <input 
                  type="text"
                  placeholder="Assunto"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="email-compose-input"
                  required
                />
              </div>

              <div>
                <textarea 
                  placeholder="Escreva sua mensagem aqui... Você pode incluir orientações, links ou detalhes das receitas."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="email-compose-textarea"
                  rows="8"
                  required
                />
              </div>

              {/* Anexos adicionados */}
              {composeAttachments.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {composeAttachments.map((att, i) => (
                    <span key={i} className="email-attachment-chip">
                      <Paperclip size={13} /> {att.name}
                      <button 
                        type="button" 
                        onClick={() => setComposeAttachments(composeAttachments.filter((_, idx) => idx !== i))}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', marginLeft: '4px' }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="email-compose-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px' }}>
                  <Paperclip size={16} /> Anexar Arquivo
                  <input 
                    type="file" 
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        const f = e.target.files[0];
                        setComposeAttachments([...composeAttachments, { name: f.name, size: `${(f.size/1024).toFixed(1)} KB` }]);
                      }
                    }} 
                    style={{ display: 'none' }} 
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setIsComposeOpen(false)} className="btn btn-outline" disabled={sending}>
                  Descartar
                </button>
                <button type="submit" className="btn btn-primary" disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={15} />
                  {sending ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
