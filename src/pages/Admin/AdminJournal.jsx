import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { sendAppNotificationEmail, generateJournalFeedbackEmail } from '../../utils/emailService';
import { 
  FileText, 
  Download, 
  ShieldCheck, 
  Sparkles, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Eye, 
  Palette, 
  Users, 
  Clock, 
  AlertCircle,
  Save
} from 'lucide-react';
import { 
  downloadJournalGuide, 
  getTermsAcceptancesLog, 
  getDocumentDownloadsLog, 
  getJournalTemplates, 
  saveJournalTemplate 
} from '../../services/journalDocumentService';

export default function AdminJournal() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'templates' | 'audit'
  const [pendingArticles, setPendingArticles] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [approvedArticles, setApprovedArticles] = useState([]);
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [journalName, setJournalName] = useState('Amoreja Diário');
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estados de Auditoria de Termos & Downloads
  const [termsLogs, setTermsLogs] = useState([]);
  const [downloadLogs, setDownloadLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Estados de Templates & Layout
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    slug: '',
    description: '',
    title_font: 'Playfair Display, serif',
    script_font: 'Alex Brush, cursive',
    body_font: 'Georgia, serif',
    bg_color: '#faf7f2',
    text_color: '#2c2c2c',
    accent_color: '#4a2c11',
    border_style: 'classic-double',
    is_active: true,
    is_default: false
  });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    
    if (!supabase) {
      setPendingArticles([]);
      setPendingEvents([]);
      setApprovedArticles([
        { id: 'mock-1', title: 'Artigo Demo', status: 'approved', start_date: new Date().toISOString(), end_date: new Date().toISOString(), new_amoreja_profiles: { full_name: 'Demo' } }
      ]);
      setApprovedEvents([]);
      setLoading(false);
      return;
    }

    try {
      // Pendentes
      const { data: pArts } = await supabase.from('new_amoreja_journal_articles')
        .select('*, new_amoreja_profiles(full_name, email)').eq('status', 'pending');
      const { data: pEvts } = await supabase.from('new_amoreja_journal_events')
        .select('*').eq('status', 'pending');
      
      // Aprovados (No Ar)
      const { data: aArts } = await supabase.from('new_amoreja_journal_articles')
        .select('*, new_amoreja_profiles(full_name, email)').eq('status', 'approved').order('start_date', { ascending: false });
      const { data: aEvts } = await supabase.from('new_amoreja_journal_events')
        .select('*').eq('status', 'approved').order('event_date', { ascending: false });

      setPendingArticles(pArts || []);
      setPendingEvents(pEvts || []);
      setApprovedArticles(aArts || []);
      setApprovedEvents(aEvts || []);

      // Busca configurações
      const { data: settings } = await supabase
        .from('new_amoreja_settings')
        .select('value')
        .eq('key', 'journal_name')
        .single();
      
      if (settings && settings.value) {
        setJournalName(settings.value);
      }

      // Templates
      const tpls = await getJournalTemplates();
      setTemplates(tpls);

    } catch (error) {
      console.error("Erro ao buscar itens:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const [terms, downloads] = await Promise.all([
        getTermsAcceptancesLog(),
        getDocumentDownloadsLog()
      ]);
      setTermsLogs(terms);
      setDownloadLogs(downloads);
    } catch (err) {
      console.error("Erro ao carregar auditoria:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'audit') {
      loadAuditLogs();
    }
    if (tab === 'templates') {
      getJournalTemplates().then(setTemplates);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('new_amoreja_settings')
        .upsert({ key: 'journal_name', value: journalName }, { onConflict: 'key' });

      if (error) throw error;
      alert("Configurações do Jornal salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar config:", err);
      alert("Falha ao salvar as configurações.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateStatus = async (table, item, newStatus) => {
    if (!window.confirm(`Deseja realmente alterar o status para ${newStatus}?`)) return;

    const isArticle = table === 'new_amoreja_journal_articles';
    const feedback = feedbacks[item.id] || '';

    try {
      const payload = { status: newStatus };
      if (feedback) payload.admin_feedback = feedback;

      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', item.id);

      if (error) throw error;

      // Disparar email se for matéria e estiver aprovando ou rejeitando
      if (isArticle && (newStatus === 'approved' || newStatus === 'rejected')) {
        const authorName = item.new_amoreja_profiles?.full_name || 'Colunista';
        const authorEmail = item.new_amoreja_profiles?.email;
        
        if (authorEmail) {
          const emailData = generateJournalFeedbackEmail({
            authorName,
            articleTitle: item.title,
            status: newStatus,
            feedback
          });
          
          await sendAppNotificationEmail({
            to: authorEmail,
            subject: emailData.subject,
            html: emailData.html,
            category: 'Jornal Feedback'
          });
        }
      }

      alert("Status atualizado com sucesso!");
      setFeedbacks(prev => ({ ...prev, [item.id]: '' }));
      fetchItems();
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      alert("Falha ao atualizar status.");
    }
  };

  // Funções de Gestão de Templates
  const handleEditTemplate = (tpl) => {
    setEditingTemplate(tpl.id || tpl.slug);
    setTemplateForm({
      id: tpl.id,
      name: tpl.name,
      slug: tpl.slug,
      description: tpl.description || '',
      title_font: tpl.title_font || 'Playfair Display, serif',
      script_font: tpl.script_font || 'Alex Brush, cursive',
      body_font: tpl.body_font || 'Georgia, serif',
      bg_color: tpl.bg_color || '#faf7f2',
      text_color: tpl.text_color || '#2c2c2c',
      accent_color: tpl.accent_color || '#4a2c11',
      border_style: tpl.border_style || 'classic-double',
      is_active: tpl.is_active !== undefined ? tpl.is_active : true,
      is_default: tpl.is_default || false
    });
  };

  const handleNewTemplate = () => {
    setEditingTemplate('new');
    setTemplateForm({
      name: 'Novo Modelo Editorial',
      slug: `custom-${Date.now()}`,
      description: 'Modelo visual personalizado do Jornal',
      title_font: 'Playfair Display, serif',
      script_font: 'Alex Brush, cursive',
      body_font: 'Georgia, serif',
      bg_color: '#faf7f2',
      text_color: '#2c2c2c',
      accent_color: '#4a2c11',
      border_style: 'classic-double',
      is_active: true,
      is_default: false
    });
  };

  const handleSaveTemplateSubmit = async (e) => {
    e.preventDefault();
    setSavingTemplate(true);
    try {
      await saveJournalTemplate(templateForm);
      alert("Template visual salvo com sucesso!");
      setEditingTemplate(null);
      const updated = await getJournalTemplates();
      setTemplates(updated);
    } catch (err) {
      alert("Erro ao salvar template: " + err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  if (loading) return <div style={{ padding: '30px', textAlign: 'center' }}>Carregando dados do Jornal...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📰 Gestão do Jornal do Amigurumi
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Aprovação de matérias, customização de templates, auditoria de termos e downloads do Guia Oficial.
          </p>
        </div>

        <button 
          className="btn btn-outline"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff' }}
          onClick={() => downloadJournalGuide({ id: 'admin', email: 'admin@amoreja.com.br' }, { full_name: 'Administrador Master' })}
        >
          <Download size={16} /> Baixar Guia Oficial (PDF)
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '10px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleTabChange('pending')}
        >
          ⏳ Pendentes ({pendingArticles.length + pendingEvents.length})
        </button>
        <button 
          className={`btn ${activeTab === 'approved' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleTabChange('approved')}
        >
          ✅ Aprovados no Ar ({approvedArticles.length})
        </button>
        <button 
          className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleTabChange('templates')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Palette size={16} /> Layout & Templates ({templates.length})
        </button>
        <button 
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleTabChange('audit')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ShieldCheck size={16} /> Termos & Auditoria de Downloads
        </button>
      </div>

      {/* ABA: PENDENTES */}
      {activeTab === 'pending' && (
        <>
          <section style={{ marginTop: '30px' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Matérias Pendentes de Revisão ({pendingArticles.length})</h3>
            {pendingArticles.length === 0 ? (
              <div style={{ background: '#f8fafc', padding: '30px', textAlign: 'center', borderRadius: '8px', color: '#64748b', border: '1px solid #e2e8f0' }}>
                Nenhuma matéria pendente de aprovação no momento.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <table className="admin-table" style={{ width: '100%', minWidth: '700px' }}>
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>Colunista</th>
                      <th>Título</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Formato Visual</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Validade</th>
                      <th>Feedback / Orientação</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingArticles.map(art => (
                      <tr key={art.id}>
                        <td>
                          <strong>{art.new_amoreja_profiles?.full_name || 'Desconhecido'}</strong>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{art.new_amoreja_profiles?.email}</div>
                        </td>
                        <td>
                          <strong>{art.title}</strong>
                          {art.subtitle && <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>{art.subtitle}</div>}
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                            {art.layout_model || 'classic'}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(art.start_date).toLocaleDateString()} a {new Date(art.end_date).toLocaleDateString()}</td>
                        <td>
                          <textarea 
                            className="form-control" 
                            placeholder="Motivo da aprovação/rejeição ou dicas editoriais..." 
                            rows="2"
                            value={feedbacks[art.id] || ''}
                            onChange={(e) => setFeedbacks(prev => ({...prev, [art.id]: e.target.value}))}
                          ></textarea>
                        </td>
                        <td style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleUpdateStatus('new_amoreja_journal_articles', art, 'approved')}>
                            Aprovar
                          </button>
                          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#d93025', color: '#d93025' }} onClick={() => handleUpdateStatus('new_amoreja_journal_articles', art, 'rejected')}>
                            Rejeitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={{ marginTop: '40px' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Eventos do Calendário Pendentes ({pendingEvents.length})</h3>
            {pendingEvents.length === 0 ? (
              <p style={{ color: '#64748b' }}>Nenhum evento pendente.</p>
            ) : (
              <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                <table className="admin-table" style={{ width: '100%', minWidth: '550px' }}>
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>Colunista</th>
                      <th>Evento</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Data e Hora</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingEvents.map(evt => (
                      <tr key={evt.id}>
                        <td>{evt.new_amoreja_profiles?.full_name || 'Desconhecido'}</td>
                        <td><strong>{evt.title}</strong></td>
                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(evt.event_date).toLocaleString()}</td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleUpdateStatus('new_amoreja_journal_events', evt, 'approved')}>Aprovar</button>
                          <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px', borderColor: '#d93025', color: '#d93025' }} onClick={() => handleUpdateStatus('new_amoreja_journal_events', evt, 'rejected')}>Rejeitar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ABA: APROVADOS (NO AR) */}
      {activeTab === 'approved' && (
        <section style={{ marginTop: '30px' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#1e293b' }}>Matérias Publicadas no Ar ({approvedArticles.length})</h3>
          {approvedArticles.length === 0 ? (
            <div style={{ background: '#f8fafc', padding: '30px', textAlign: 'center', borderRadius: '8px', color: '#64748b' }}>
              Nenhuma matéria em exibição no momento.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table className="admin-table" style={{ width: '100%', minWidth: '600px' }}>
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Colunista</th>
                    <th>Título</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Período no Ar</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Curtidas</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedArticles.map(art => (
                    <tr key={art.id}>
                      <td>
                        <strong>{art.new_amoreja_profiles?.full_name || 'Desconhecido'}</strong>
                      </td>
                      <td>{art.title}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(art.start_date).toLocaleDateString()} a {new Date(art.end_date).toLocaleDateString()}</td>
                      <td>👍 {art.likes_count || 0}</td>
                      <td>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '4px 10px', fontSize: '12px', borderColor: '#d97706', color: '#d97706', whiteSpace: 'nowrap' }} 
                          onClick={() => handleUpdateStatus('new_amoreja_journal_articles', art, 'archived')}
                        >
                          Retirar do Ar (Arquivar)
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ABA: LAYOUT & GERENCIADOR DE TEMPLATES */}
      {activeTab === 'templates' && (
        <div style={{ marginTop: '30px' }}>
          
          {/* Configurações Globais */}
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#1e293b' }}>⚙️ Configurações Globais do Jornal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#334155' }}>Nome Oficial do Jornal:</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={journalName} 
                  onChange={(e) => setJournalName(e.target.value)}
                  placeholder="Ex: Jornal do Amigurumi"
                />
              </div>
              <div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Save size={16} />
                  {savingSettings ? 'Salvando...' : 'Salvar Nome Oficial'}
                </button>
              </div>
            </div>
          </div>

          {/* Gerenciador de Templates Visuais */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#1e293b' }}>🎨 Modelos de Layout (Templates)</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                Crie e customize múltiplos estilos visuais, fontes, cores e bordas para o Jornal.
              </p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={handleNewTemplate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Criar Novo Template
            </button>
          </div>

          {/* Formulário de Criação/Edição de Template */}
          {editingTemplate && (
            <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '2px solid #0284c7', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, color: '#0369a1', fontSize: '1.15rem' }}>
                  {editingTemplate === 'new' ? '✨ Novo Template Visual' : `✏️ Editar Template: ${templateForm.name}`}
                </h4>
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => setEditingTemplate(null)}>
                  Fechar Edição
                </button>
              </div>

              <form onSubmit={handleSaveTemplateSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                  
                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nome do Template *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={templateForm.name} 
                      onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})} 
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Identificador (Slug) *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={templateForm.slug} 
                      onChange={(e) => setTemplateForm({...templateForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} 
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Fonte do Título (Serifada)</label>
                    <select 
                      className="form-control"
                      value={templateForm.title_font}
                      onChange={(e) => setTemplateForm({...templateForm, title_font: e.target.value})}
                    >
                      <option value="Playfair Display, serif">Playfair Display (Clássica)</option>
                      <option value="Cormorant Garamond, serif">Cormorant Garamond (Elegante)</option>
                      <option value="Inter, sans-serif">Inter (Moderna / Sem serifa)</option>
                      <option value="Lora, serif">Lora (Editorial Suave)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Fonte do Subtítulo (Caligráfica)</label>
                    <select 
                      className="form-control"
                      value={templateForm.script_font}
                      onChange={(e) => setTemplateForm({...templateForm, script_font: e.target.value})}
                    >
                      <option value="Alex Brush, cursive">Alex Brush (Cursiva Pág. 5)</option>
                      <option value="Great Vibes, cursive">Great Vibes (Fluida)</option>
                      <option value="Style Script, cursive">Style Script (Contemporânea)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Cor de Fundo / Papel</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="color" 
                        value={templateForm.bg_color.startsWith('#') ? templateForm.bg_color : '#faf7f2'} 
                        onChange={(e) => setTemplateForm({...templateForm, bg_color: e.target.value})}
                        style={{ width: '40px', height: '38px', padding: 0, border: 'none', cursor: 'pointer' }}
                      />
                      <input 
                        type="text" 
                        className="form-control" 
                        value={templateForm.bg_color} 
                        onChange={(e) => setTemplateForm({...templateForm, bg_color: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Cor do Texto</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="color" 
                        value={templateForm.text_color.startsWith('#') ? templateForm.text_color : '#2c2c2c'} 
                        onChange={(e) => setTemplateForm({...templateForm, text_color: e.target.value})}
                        style={{ width: '40px', height: '38px', padding: 0, border: 'none', cursor: 'pointer' }}
                      />
                      <input 
                        type="text" 
                        className="form-control" 
                        value={templateForm.text_color} 
                        onChange={(e) => setTemplateForm({...templateForm, text_color: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '4px' }}>Cor de Destaque / Acentos</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="color" 
                        value={templateForm.accent_color.startsWith('#') ? templateForm.accent_color : '#4a2c11'} 
                        onChange={(e) => setTemplateForm({...templateForm, accent_color: e.target.value})}
                        style={{ width: '40px', height: '38px', padding: 0, border: 'none', cursor: 'pointer' }}
                      />
                      <input 
                        type="text" 
                        className="form-control" 
                        value={templateForm.accent_color} 
                        onChange={(e) => setTemplateForm({...templateForm, accent_color: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={templateForm.is_active} 
                        onChange={(e) => setTemplateForm({...templateForm, is_active: e.target.checked})} 
                      />
                      Ativo para Colunistas
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={templateForm.is_default} 
                        onChange={(e) => setTemplateForm({...templateForm, is_default: e.target.checked})} 
                      />
                      Template Padrão
                    </label>
                  </div>

                </div>

                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                  <button type="submit" className="btn btn-primary" disabled={savingTemplate}>
                    {savingTemplate ? 'Salvando...' : '💾 Salvar Template'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grid de Templates */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {templates.map(tpl => (
              <div 
                key={tpl.id || tpl.slug}
                style={{ 
                  backgroundColor: tpl.bg_color || '#faf7f2', 
                  border: `2px solid ${tpl.accent_color || '#3d2b1f'}`, 
                  borderRadius: '10px', 
                  padding: '20px', 
                  color: tpl.text_color || '#2c2c2c',
                  position: 'relative',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
              >
                {tpl.is_default && (
                  <span style={{ position: 'absolute', top: '12px', right: '12px', background: tpl.accent_color || '#4a2c11', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                    Padrão Oficial
                  </span>
                )}

                <h4 style={{ fontFamily: tpl.title_font || 'Playfair Display, serif', fontSize: '1.4rem', margin: '0 0 4px 0' }}>
                  {tpl.name}
                </h4>
                <div style={{ fontFamily: tpl.script_font || 'Alex Brush, cursive', fontSize: '1.4rem', color: tpl.accent_color || '#4a2c11', marginBottom: '12px' }}>
                  Cada criação carrega uma história.
                </div>
                <p style={{ fontSize: '13px', margin: '0 0 16px 0', opacity: 0.85 }}>
                  {tpl.description || 'Layout personalizado para publicação de matérias.'}
                </p>

                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <span style={{ background: 'rgba(0,0,0,0.06)', padding: '3px 8px', borderRadius: '4px' }}>Fonte: {tpl.title_font?.split(',')[0]}</span>
                  <span style={{ background: 'rgba(0,0,0,0.06)', padding: '3px 8px', borderRadius: '4px' }}>Cursiva: {tpl.script_font?.split(',')[0]}</span>
                  <span style={{ background: 'rgba(0,0,0,0.06)', padding: '3px 8px', borderRadius: '4px' }}>Fundo: {tpl.bg_color}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: tpl.is_active ? '#166534' : '#991b1b' }}>
                    {tpl.is_active ? '✅ Ativo' : '⏸️ Inativo'}
                  </span>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => handleEditTemplate(tpl)}
                  >
                    <Edit3 size={13} /> Editar
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ABA: AUDITORIA DE TERMOS & DOWNLOADS */}
      {activeTab === 'audit' && (
        <div style={{ marginTop: '30px' }}>
          
          {loadingLogs ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando registros de auditoria...</div>
          ) : (
            <>
              {/* Tabela de Aceites dos Termos */}
              <section style={{ marginBottom: '40px', background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={20} color="#16a34a" /> Colunistas que Assinaram o Termo de Adesão ({termsLogs.length})
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                      Registro de consentimento formal prévio à primeira publicação.
                    </p>
                  </div>
                  <button className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={loadAuditLogs}>
                    Atualizar Lista
                  </button>
                </div>

                {termsLogs.length === 0 ? (
                  <p style={{ color: '#64748b', fontStyle: 'italic', margin: '20px 0' }}>Nenhum aceite registrado ainda.</p>
                ) : (
                  <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                    <table className="admin-table" style={{ width: '100%', minWidth: '640px' }}>
                      <thead>
                        <tr>
                          <th style={{ whiteSpace: 'nowrap' }}>Nome do Colunista</th>
                          <th style={{ whiteSpace: 'nowrap' }}>E-mail</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Versão do Termo</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Data e Hora do Aceite</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {termsLogs.map((log, i) => (
                          <tr key={log.id || i}>
                            <td style={{ fontWeight: 600 }}>{log.user_name || 'Colunista'}</td>
                            <td style={{ color: '#64748b' }}>{log.user_email || '—'}</td>
                            <td><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}>{log.terms_version}</span></td>
                            <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>{new Date(log.accepted_at).toLocaleString('pt-BR')}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <span style={{ color: '#166534', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                                <CheckCircle2 size={14} /> Aceito e Válido
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Tabela de Downloads do Guia Oficial */}
              <section style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Download size={20} color="#0284c7" /> Registro de Downloads do Documento Oficial ({downloadLogs.length})
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                      Histórico de usuários autorizados que baixaram o arquivo <code>JdA-GPColaboradores-Atualizado.pdf</code>.
                    </p>
                  </div>
                </div>

                {downloadLogs.length === 0 ? (
                  <p style={{ color: '#64748b', fontStyle: 'italic', margin: '20px 0' }}>Nenhum download registrado ainda.</p>
                ) : (
                  <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                    <table className="admin-table" style={{ width: '100%', minWidth: '600px' }}>
                      <thead>
                        <tr>
                          <th style={{ whiteSpace: 'nowrap' }}>Usuário</th>
                          <th style={{ whiteSpace: 'nowrap' }}>E-mail</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Documento Baixado</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Data e Hora do Download</th>
                        </tr>
                      </thead>
                      <tbody>
                        {downloadLogs.map((log, i) => (
                          <tr key={log.id || i}>
                            <td style={{ fontWeight: 600 }}>{log.user_name || 'Usuário'}</td>
                            <td style={{ color: '#64748b' }}>{log.user_email || '—'}</td>
                            <td>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#4a2c11', fontSize: '13px' }}>
                                <FileText size={14} /> {log.document_name}
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>{new Date(log.downloaded_at).toLocaleString('pt-BR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

        </div>
      )}

    </div>
  );
}
