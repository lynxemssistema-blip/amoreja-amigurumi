import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  Eye, 
  Edit3, 
  FileText, 
  Download, 
  Sparkles, 
  Calendar, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import DOMPurify from 'dompurify';
import JournalTermsModal from '../../components/JournalTermsModal';
import JournalAIAgent from '../../components/JournalAIAgent';
import { 
  checkHasAcceptedTerms, 
  downloadJournalGuide, 
  getJournalTemplates 
} from '../../services/journalDocumentService';

export default function ArticleEditor({ article, onBack, user, profile }) {
  const [formData, setFormData] = useState({
    title: article?.title || '',
    subtitle: article?.subtitle || '',
    content: article?.content || '',
    cover_image: article?.cover_image || '',
    layout_model: article?.layout_model || 'classic',
    start_date: article?.start_date ? new Date(article.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    end_date: article?.end_date ? new Date(article.end_date).toISOString().split('T')[0] : new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
    social_links: article?.social_links ? JSON.stringify(article.social_links) : '[]',
  });
  
  const [hasEvent, setHasEvent] = useState(false);
  const [eventData, setEventData] = useState({
    title: '',
    event_date: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // File upload state
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modo de visualização: 'form' | 'preview'
  const [viewMode, setViewMode] = useState('form');

  // Termos de Adesão
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [checkingTerms, setCheckingTerms] = useState(true);

  // Templates disponíveis
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState(null);

  // Checar se aceitou termos e buscar templates
  useEffect(() => {
    async function init() {
      if (user) {
        setCheckingTerms(true);
        const accepted = await checkHasAcceptedTerms(user, profile);
        setHasAcceptedTerms(accepted);
        if (!accepted && !article?.id) {
          setShowTermsModal(true);
        }

        const tpls = await getJournalTemplates();
        setAvailableTemplates(tpls);
        const selected = tpls.find(t => t.slug === formData.layout_model) || tpls[0];
        setCurrentTemplate(selected);
        setCheckingTerms(false);
      }
    }
    init();
  }, [user, profile, article]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'layout_model') {
      const selected = availableTemplates.find(t => t.slug === value);
      if (selected) setCurrentTemplate(selected);
    }
  };

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError(null);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `journal_${user.id}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `journal-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('produto_imagens')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('produto_imagens')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, cover_image: publicUrl }));
    } catch (err) {
      console.error('Erro no upload:', err);
      setError('Erro ao enviar imagem. Verifique se o tamanho é menor que 2MB.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTermsAccepted = () => {
    setHasAcceptedTerms(true);
    setShowTermsModal(false);
  };

  const handleDownloadPDF = async () => {
    try {
      await downloadJournalGuide(user, profile);
    } catch (err) {
      alert("Erro ao baixar documento: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Se ainda não aceitou o termo, bloqueia e abre modal
    if (!hasAcceptedTerms) {
      setShowTermsModal(true);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      let parsedLinks = [];
      try {
        parsedLinks = JSON.parse(formData.social_links);
      } catch (e) {
        // Ignora
      }

      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        content: formData.content,
        cover_image: formData.cover_image,
        layout_model: formData.layout_model,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        social_links: parsedLinks,
        author_id: user.id,
        status: 'pending' // Volta para pending ao submeter
      };

      if (article?.id) {
        const { error: updateError } = await supabase
          .from('new_amoreja_journal_articles')
          .update(payload)
          .eq('id', article.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('new_amoreja_journal_articles')
          .insert([payload]);
        if (insertError) throw insertError;
      }

      // Se tiver evento associado
      if (hasEvent && eventData.title && eventData.event_date && !article?.id) {
        const { error: eventError } = await supabase
          .from('new_amoreja_journal_events')
          .insert([{
            title: eventData.title.trim(),
            event_date: new Date(eventData.event_date).toISOString(),
            author_id: user.id,
            status: 'pending',
            social_links: parsedLinks
          }]);
        if (eventError) console.error("Erro ao criar evento", eventError);
      }

      setSuccess(true);
      setTimeout(() => {
        onBack();
      }, 2000);

    } catch (err) {
      console.error('Erro ao salvar matéria:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const authorDisplayName = profile?.full_name || user?.user_metadata?.full_name || 'Colunista Amoreja';
  const authorInstagram = profile?.instagram_handle || profile?.partner_instagram || '@amorejaamigurumi';
  const authorAvatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200';

  return (
    <div className="article-editor-container" style={{ padding: '10px 0' }}>
      
      {/* Modal de Aceite dos Termos */}
      <JournalTermsModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)}
        onAccepted={handleTermsAccepted}
        user={user}
        profile={profile}
      />

      {/* Header do Editor */}
      <div className="editor-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b' }}>
            {article ? '✏️ Editar Matéria' : '✍️ Nova Matéria do Jornal'}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            Modelo de layout fiel ao Guia de Participação Oficial (Edição 001/26)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            type="button" 
            className="btn btn-outline" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            onClick={handleDownloadPDF}
            title="Baixar cópia oficial do Guia"
          >
            <Download size={14} /> Guia em PDF
          </button>

          {/* Toggle de Pré-Visualização */}
          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '3px' }}>
            <button
              type="button"
              onClick={() => setViewMode('form')}
              style={{
                border: 'none',
                background: viewMode === 'form' ? '#fff' : 'transparent',
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: viewMode === 'form' ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Edit3 size={14} /> Redigir
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              style={{
                border: 'none',
                background: viewMode === 'preview' ? '#4a2c11' : 'transparent',
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: viewMode === 'preview' ? '#faf7f2' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Eye size={14} /> Pré-visualizar (Página 5)
            </button>
          </div>

          <button className="btn btn-outline" onClick={onBack}>Voltar</button>
        </div>
      </div>

      {/* Alertas de Status / Aceite */}
      {!hasAcceptedTerms && (
        <div className="alert alert-warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '12px 18px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '8px', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={20} color="#b45309" />
            <div>
              <strong>Termo de Adesão Pendente:</strong> Você precisa aceitar as diretrizes do Guia antes de publicar.
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-primary" 
            style={{ padding: '6px 14px', fontSize: '0.85rem', background: '#b45309', border: 'none' }}
            onClick={() => setShowTermsModal(true)}
          >
            Ler e Assinar Termo
          </button>
        </div>
      )}

      {article?.admin_feedback && (
        <div className="alert alert-warning" style={{ marginBottom: '20px', padding: '14px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '6px', borderLeft: '4px solid #ffeeba' }}>
          <strong>Feedback do Administrador:</strong>
          <p style={{ margin: '4px 0 0 0', fontStyle: 'italic' }}>"{article.admin_feedback}"</p>
        </div>
      )}

      {error && <div className="alert alert-danger" style={{ marginBottom: '20px', padding: '10px 14px', backgroundColor: '#fce8e6', color: '#d93025', borderRadius: '6px' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '20px', padding: '10px 14px', backgroundColor: '#e6f4ea', color: '#1e8e3e', borderRadius: '6px' }}>🎉 Matéria salva com sucesso! O administrador irá revisá-la em breve. Redirecionando...</div>}

      {/* MODO FORMULÁRIO DE REDAÇÃO */}
      {viewMode === 'form' && (
        <>
          {/* AGENTE ESPECIALISTA EM PAUTAS, REDAÇÃO & IMAGENS LIVRES DO JORNAL */}
          <JournalAIAgent 
            currentFormData={formData}
            onApplyArticle={(dataToApply) => {
              setFormData(prev => ({
                ...prev,
                ...dataToApply
              }));
            }}
          />

          <form className="editor-form" onSubmit={handleSubmit} style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          
          <div className="form-group">
            <label style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
              <Sparkles size={16} color="#4a2c11" /> Formato Visual / Template do Jornal
            </label>
            <select 
              name="layout_model" 
              value={formData.layout_model} 
              onChange={handleChange}
              className="form-control"
              style={{ padding: '10px', fontSize: '0.95rem' }}
              required
            >
              {availableTemplates.map(tpl => (
                <option key={tpl.slug} value={tpl.slug}>
                  {tpl.slug === 'classic' ? '📰 ' : tpl.slug === 'modern' ? '✨ ' : '📸 '}
                  {tpl.name} {tpl.is_default ? '(Padrão Oficial)' : ''}
                </option>
              ))}
            </select>
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
              {currentTemplate?.description || "Visual clássico com estética nobre de jornal impresso, cabeçalho elegante e tipografia refinada."}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label style={{ fontWeight: 700, color: '#1e293b' }}>Título da Matéria *</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              className="form-control"
              placeholder="Ex: FIOS QUE NOS UNEM"
              style={{ fontSize: '1.1rem', fontWeight: 600 }}
              required 
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 700, color: '#1e293b' }}>
              Subtítulo / Linha Fina (Caligrafia Elegante)
            </label>
            <input 
              type="text" 
              name="subtitle" 
              value={formData.subtitle} 
              onChange={handleChange} 
              className="form-control"
              placeholder="Ex: Cada criação carrega uma história."
            />
            <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
              Dica: Este subtítulo é renderizado com tipografia caligráfica artística cursiva como no documento oficial.
            </small>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 700, color: '#1e293b' }}>Imagem de Capa / Ilustração</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                disabled={uploadingImage}
              />
              {uploadingImage && <span style={{ color: '#4a2c11', fontWeight: 600 }}>Enviando imagem...</span>}
            </div>
            {formData.cover_image && (
              <div style={{ marginTop: '12px', position: 'relative', display: 'inline-block' }}>
                <img 
                  src={formData.cover_image} 
                  alt="Capa" 
                  style={{ maxHeight: '180px', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                />
              </div>
            )}
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label style={{ fontWeight: 700, color: '#1e293b' }}>Data de Início da Exibição</label>
              <input 
                type="date" 
                name="start_date" 
                value={formData.start_date} 
                onChange={handleChange} 
                className="form-control"
                required 
              />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: 700, color: '#1e293b' }}>Data Final (Validade)</label>
              <input 
                type="date" 
                name="end_date" 
                value={formData.end_date} 
                onChange={handleChange} 
                className="form-control"
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 700, color: '#1e293b' }}>Texto / Conteúdo da Matéria *</label>
            <textarea 
              name="content" 
              value={formData.content} 
              onChange={handleChange} 
              className="form-control"
              rows="12"
              placeholder="Escreva a sua matéria aqui... (Parágrafos bem estruturados e pontuação cuidada)"
              style={{ lineHeight: '1.6', fontSize: '0.95rem' }}
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 700, color: '#1e293b' }}>
              Links de Redes Sociais / Fontes (JSON ou Lista)
            </label>
            <input 
              type="text" 
              name="social_links" 
              value={formData.social_links} 
              onChange={handleChange} 
              className="form-control"
              placeholder='[{"platform":"instagram","url":"https://instagram.com/seuperfil"}]'
            />
          </div>

          {!article && (
            <div className="form-group" style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                <input 
                  type="checkbox" 
                  checked={hasEvent} 
                  onChange={(e) => setHasEvent(e.target.checked)} 
                />
                <strong>📅 Vincular uma data ou live ao Calendário do Jornal?</strong>
              </label>

              {hasEvent && (
                <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Nome do Evento / Live</label>
                    <input 
                      type="text" 
                      name="title" 
                      value={eventData.title} 
                      onChange={handleEventChange} 
                      className="form-control" 
                      required={hasEvent}
                    />
                  </div>
                  <div className="form-group">
                    <label>Data e Hora</label>
                    <input 
                      type="datetime-local" 
                      name="event_date" 
                      value={eventData.event_date} 
                      onChange={handleEventChange} 
                      className="form-control"
                      required={hasEvent} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '25px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <button 
              type="button" 
              className="btn btn-outline"
              onClick={() => setViewMode('preview')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Eye size={16} /> Ver como ficará no Jornal
            </button>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ padding: '12px 28px', fontSize: '1rem', background: '#4a2c11', borderColor: '#3d2b1f' }}
              disabled={isSubmitting || uploadingImage}
            >
              {isSubmitting ? 'Enviando...' : '📤 Salvar e Enviar para Revisão'}
            </button>
          </div>
        </form>
        </>
      )}

      {/* MODO PRÉ-VISUALIZAÇÃO WYSIWYG (Página 5 Fiel ao Documento) */}
      {viewMode === 'preview' && (
        <div className="journal-page-preview animate-fade-in" style={{ backgroundColor: currentTemplate?.bg_color || '#faf7f2', padding: '30px 20px', borderRadius: '12px', border: '2px solid #3d2b1f', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', color: currentTemplate?.text_color || '#2c2c2c', fontFamily: currentTemplate?.body_font || 'Georgia, serif' }}>
          
          {/* Header Superior do Jornal */}
          <div style={{ borderBottom: '2px solid #3d2b1f', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Inter, sans-serif', color: '#634b35', flexWrap: 'wrap' }}>
            <span>@jornaldoamigurumi</span>
            <span style={{ fontWeight: 700 }}>JORNAL COLABORATIVO</span>
            <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>

          {/* Cabeçalho da Edição com Selo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #3d2b1f', paddingBottom: '16px', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px dashed #4a2c11', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '8px', textTransform: 'uppercase', fontWeight: 800, textAlign: 'center', color: '#4a2c11' }}>
                <span>JORNAL</span>
                <span style={{ fontSize: '13px' }}>🧶</span>
                <span>AMIGURUMI</span>
              </div>
              <div>
                <h1 style={{ fontFamily: currentTemplate?.title_font || 'Playfair Display, serif', fontSize: '2.4rem', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.5px', color: '#2b1a0e', lineHeight: 1.1 }}>
                  JORNAL DO AMIGURUMI
                </h1>
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', color: '#555' }}>
              <strong style={{ display: 'block', color: '#4a2c11' }}>GUIA DE PARTICIPAÇÃO</strong>
              <span>ED. 001/26</span>
            </div>
          </div>

          {/* Faixa do Colunista & Citação */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', alignItems: 'center', background: '#f4ece1', padding: '14px 20px', borderRadius: '8px', border: '1px solid #e0d5c4', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img 
                src={authorAvatar} 
                alt={authorDisplayName} 
                style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #4a2c11' }} 
              />
              <div>
                <strong style={{ display: 'block', fontSize: '1rem', color: '#2b1a0e' }}>{authorDisplayName}</strong>
                <span style={{ fontSize: '0.8rem', color: '#785e45', fontFamily: 'Inter, sans-serif' }}>{authorInstagram}</span>
              </div>
            </div>
            <div style={{ fontStyle: 'italic', fontSize: '0.95rem', color: '#4a2c11', borderLeft: '2px solid #bba993', paddingLeft: '14px', lineHeight: '1.4' }}>
              "Mais do que criar receitas, eu escolhi criar movimentos que fortalecem pessoas."
            </div>
          </div>

          {/* Título & Subtítulo da Matéria */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: currentTemplate?.title_font || 'Playfair Display, serif', fontSize: '2.6rem', color: '#2b1a0e', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
              {formData.title || 'TÍTULO DA SUA MATÉRIA'}
            </h2>
            <div style={{ fontFamily: currentTemplate?.script_font || 'Alex Brush, cursive', fontSize: '2.2rem', color: '#4a2c11', margin: '0 0 16px 0' }}>
              {formData.subtitle || 'Cada criação carrega uma história.'}
            </div>
          </div>

          {/* Imagem de Capa */}
          {formData.cover_image && (
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <img 
                src={formData.cover_image} 
                alt="Capa da Matéria" 
                style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '8px', border: '1px solid #d8cbbe', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }} 
              />
            </div>
          )}

          {/* Corpo do Texto em Colunas Editoriais */}
          <div 
            style={{ 
              columnCount: window.innerWidth > 768 ? 2 : 1, 
              columnGap: '36px', 
              textAlign: 'justify', 
              lineHeight: '1.7', 
              fontSize: '1rem',
              color: currentTemplate?.text_color || '#2c2c2c',
              marginBottom: '35px'
            }}
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize((formData.content || 'Escreva o conteúdo da sua matéria no formulário para visualizar como ela será formatada em colunas editoriais.').replace(/\n/g, '<br />')) 
            }}
          />

          {/* Bloco de Expediente & Equipe Editorial */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', background: '#f3ece1', padding: '20px', borderRadius: '8px', border: '1px solid #e0d4c3', marginTop: '30px', fontSize: '0.85rem', fontFamily: 'Inter, sans-serif' }}>
            <div>
              <strong style={{ display: 'block', textTransform: 'uppercase', color: '#4a2c11', marginBottom: '4px', fontSize: '0.75rem', letterSpacing: '0.5px' }}>IDEALIZAÇÃO, PREPARAÇÃO E ORGANIZAÇÃO</strong>
              <div style={{ fontWeight: 600, color: '#2b1a0e' }}>Marcia Reggiani</div>
              <div style={{ color: '#785e45' }}>@amorejaamigurumi</div>
            </div>
            <div>
              <strong style={{ display: 'block', textTransform: 'uppercase', color: '#4a2c11', marginBottom: '4px', fontSize: '0.75rem', letterSpacing: '0.5px' }}>EDIÇÃO DE TEXTOS E REVISÃO</strong>
              <div style={{ fontWeight: 600, color: '#2b1a0e' }}>Cíntia Ferrer</div>
              <div style={{ color: '#785e45' }}>@micajitadesuenos</div>
            </div>
            <div>
              <strong style={{ display: 'block', textTransform: 'uppercase', color: '#4a2c11', marginBottom: '4px', fontSize: '0.75rem', letterSpacing: '0.5px' }}>CONTATOS OFICIAIS</strong>
              <div style={{ color: '#2b1a0e' }}>WhatsApp: (31) 99952.2412</div>
              <div style={{ color: '#785e45' }}>Grupo informativo para designers</div>
            </div>
          </div>

          {/* Rodapé Oficial da Página */}
          <div style={{ background: '#3d2b1f', color: '#faf7f2', padding: '10px 16px', borderRadius: '6px', textAlign: 'center', marginTop: '20px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Inter, sans-serif', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span>TODOS OS LINKS E @ SÃO CLICÁVEIS</span>
            <span>WWW.AMOREJA.COM.BR/JORNAL</span>
            <span style={{ background: '#faf7f2', color: '#3d2b1f', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>PÁG. 5</span>
          </div>

          <div style={{ textAlign: 'center', marginTop: '25px' }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={() => setViewMode('form')}
            >
              ← Voltar ao Formulário de Edição
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
