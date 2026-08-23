import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

export default function ArticleEditor({ article, onBack, user }) {
  const [formData, setFormData] = useState({
    title: article?.title || '',
    subtitle: article?.subtitle || '',
    content: article?.content || '',
    cover_image: article?.cover_image || '',
    layout_model: article?.layout_model || 'classic',
    start_date: article?.start_date ? new Date(article.start_date).toISOString().split('T')[0] : '',
    end_date: article?.end_date ? new Date(article.end_date).toISOString().split('T')[0] : '',
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      const fileName = `journal_${user.id}_${Math.random()}.${fileExt}`;
      const filePath = `journal-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('produto_imagens') // Utilizando bucket existente
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      let parsedLinks = [];
      try {
        parsedLinks = JSON.parse(formData.social_links);
      } catch (e) {
        // Ignora ou trata erro de parse
      }

      const payload = {
        title: formData.title,
        subtitle: formData.subtitle,
        content: formData.content,
        cover_image: formData.cover_image,
        layout_model: formData.layout_model,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        social_links: parsedLinks,
        author_id: user.id,
        status: 'pending' // Volta para pending ao editar
      };

      if (article?.id) {
        // Update
        const { error: updateError } = await supabase
          .from('new_amoreja_journal_articles')
          .update(payload)
          .eq('id', article.id);
        if (updateError) throw updateError;
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from('new_amoreja_journal_articles')
          .insert([payload]);
        if (insertError) throw insertError;
      }

      // Se tiver evento, cria também
      if (hasEvent && eventData.title && eventData.event_date && !article?.id) {
        const { error: eventError } = await supabase
          .from('new_amoreja_journal_events')
          .insert([{
            title: eventData.title,
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

  return (
    <div className="article-editor">
      <div className="editor-header">
        <h3>{article ? 'Editar Matéria' : 'Nova Matéria'}</h3>
        <button className="btn btn-outline" onClick={onBack}>Voltar</button>
      </div>

      {article?.admin_feedback && (
        <div className="alert alert-warning" style={{marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: '4px', borderLeft: '4px solid #ffeeba'}}>
          <strong>Feedback do Administrador:</strong>
          <p style={{ margin: '5px 0 0 0', fontStyle: 'italic' }}>"{article.admin_feedback}"</p>
        </div>
      )}

      {error && <div className="alert alert-danger" style={{marginBottom: '20px', padding: '10px', backgroundColor: '#fce8e6', color: '#d93025', borderRadius: '4px'}}>{error}</div>}
      {success && <div className="alert alert-success" style={{marginBottom: '20px', padding: '10px', backgroundColor: '#e6f4ea', color: '#1e8e3e', borderRadius: '4px'}}>Matéria salva com sucesso! O administrador irá revisá-la em breve. Redirecionando...</div>}

      <form className="editor-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Modelo de Layout Visual</label>
          <select 
            name="layout_model" 
            value={formData.layout_model} 
            onChange={handleChange}
            className="form-control"
            required
          >
            <option value="classic">📰 Clássico (Estilo Jornal Tradicional)</option>
            <option value="modern">✨ Moderno (Destaque Visual)</option>
            <option value="image-heavy">📸 Imagem Ampla (Foco em Fotos)</option>
          </select>
          <div className="layout-preview">
            {formData.layout_model === 'classic' && "O título ficará em fonte serifada grande, com o texto dividido em colunas como num jornal impresso."}
            {formData.layout_model === 'modern' && "Visual mais espaçado, com fonte arredondada e detalhes coloridos."}
            {formData.layout_model === 'image-heavy' && "A imagem de capa cobrirá toda a largura do cabeçalho da matéria."}
          </div>
        </div>

        <div className="form-group">
          <label>Título da Matéria</label>
          <input 
            type="text" 
            name="title" 
            value={formData.title} 
            onChange={handleChange} 
            className="form-control"
            placeholder="Ex: Tendências de Fios para 2026"
            required 
          />
        </div>

        <div className="form-group">
          <label>Subtítulo / Linha Fina (Opcional)</label>
          <input 
            type="text" 
            name="subtitle" 
            value={formData.subtitle} 
            onChange={handleChange} 
            className="form-control"
            placeholder="Um breve resumo para chamar a atenção"
          />
        </div>

        <div className="form-group">
          <label>Imagem de Capa</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              disabled={uploadingImage}
            />
            {uploadingImage && <span>Enviando...</span>}
          </div>
          {formData.cover_image && (
            <div style={{ marginTop: '10px' }}>
              <img src={formData.cover_image} alt="Capa" style={{ maxHeight: '150px', borderRadius: '4px' }} />
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Data de Início da Exibição</label>
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
            <label>Data Final (Validade)</label>
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
          <label>Conteúdo da Matéria</label>
          <textarea 
            name="content" 
            value={formData.content} 
            onChange={handleChange} 
            className="form-control"
            rows="10"
            placeholder="Escreva a matéria aqui..."
            required
          ></textarea>
        </div>

        <div className="form-group">
          <label>Links de Redes Sociais (Formato JSON, ex: [&#123;"platform":"instagram","url":"..."&#125;])</label>
          <input 
            type="text" 
            name="social_links" 
            value={formData.social_links} 
            onChange={handleChange} 
            className="form-control"
          />
        </div>

        {!article && (
          <div className="form-group" style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
              <input 
                type="checkbox" 
                checked={hasEvent} 
                onChange={(e) => setHasEvent(e.target.checked)} 
              />
              <strong>Vincular um Evento ao Calendário do Jornal?</strong>
            </label>

            {hasEvent && (
              <div style={{ marginTop: '16px' }} className="form-row">
                <div className="form-group">
                  <label>Nome do Evento</label>
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

        <button type="submit" className="btn btn-primary" disabled={isSubmitting || uploadingImage}>
          {isSubmitting ? 'Salvando...' : 'Salvar Matéria (Enviar para Revisão)'}
        </button>
      </form>
    </div>
  );
}
