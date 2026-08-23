import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { sendAppNotificationEmail, generateJournalFeedbackEmail } from '../../utils/emailService';

export default function AdminJournal() {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingArticles, setPendingArticles] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [approvedArticles, setApprovedArticles] = useState([]);
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [feedbacks, setFeedbacks] = useState({});
  const [journalName, setJournalName] = useState('Amoreja Diário');
  const [savingSettings, setSavingSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      // Busca matérias
      const { data: articles, error: errArt } = await supabase
        .from('new_amoreja_journal_articles')
        .select(`*, new_amoreja_profiles (full_name, email)`)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });
        
      if (errArt) throw errArt;
      
      // Busca eventos
      const { data: events, error: errEvt } = await supabase
        .from('new_amoreja_journal_events')
        .select(`*, new_amoreja_profiles (full_name, email)`)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });
        
      if (errEvt) throw errEvt;

      setPendingArticles(articles?.filter(a => a.status === 'pending') || []);
      setApprovedArticles(articles?.filter(a => a.status === 'approved') || []);
      
      setPendingEvents(events?.filter(e => e.status === 'pending') || []);
      setApprovedEvents(events?.filter(e => e.status === 'approved') || []);

      // Busca configurações
      const { data: settings } = await supabase
        .from('new_amoreja_settings')
        .select('value')
        .eq('key', 'journal_name')
        .single();
      
      if (settings && settings.value) {
        setJournalName(settings.value);
      }
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('new_amoreja_settings')
        .upsert({ key: 'journal_name', value: journalName }, { onConflict: 'key' });

      if (error) throw error;
      alert("Configurações salvas com sucesso!");
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
      fetchItems(); // recarrega
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      alert("Falha ao atualizar status.");
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Carregando pendências...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Revisão do Jornal Amoreja</h2>
      <p>Aprove, rejeite ou retire do ar as submissões dos colunistas.</p>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
        <button 
          className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('pending')}
        >
          Pendentes ({pendingArticles.length + pendingEvents.length})
        </button>
        <button 
          className={`btn ${activeTab === 'approved' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('approved')}
        >
          Aprovados (No Ar)
        </button>
        <button 
          className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('settings')}
        >
          Configurações
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="admin-journal-settings" style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3>Configurações do Jornal</h3>
          <div style={{ marginTop: '15px', maxWidth: '400px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Nome Oficial do Jornal:</label>
            <input 
              type="text" 
              className="form-control" 
              value={journalName} 
              onChange={(e) => setJournalName(e.target.value)}
              placeholder="Ex: Amoreja Diário"
            />
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '15px' }} 
              onClick={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <>
          <section style={{ marginTop: '30px' }}>
            <h3>Matérias Pendentes ({pendingArticles.length})</h3>
            {pendingArticles.length === 0 ? (
              <p>Nenhuma matéria pendente.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Colunista</th>
                    <th>Título</th>
                    <th>Validade</th>
                    <th>Comentário/Feedback</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingArticles.map(art => (
                    <tr key={art.id}>
                      <td>{art.new_amoreja_profiles?.full_name || 'Desconhecido'}</td>
                      <td>{art.title}</td>
                      <td>{new Date(art.start_date).toLocaleDateString()} a {new Date(art.end_date).toLocaleDateString()}</td>
                      <td>
                        <textarea 
                          className="form-control" 
                          placeholder="Motivo da rejeição ou dica de melhoria..." 
                          rows="2"
                          value={feedbacks[art.id] || ''}
                          onChange={(e) => setFeedbacks(prev => ({...prev, [art.id]: e.target.value}))}
                        ></textarea>
                      </td>
                      <td style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleUpdateStatus('new_amoreja_journal_articles', art, 'approved')}>Aprovar</button>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px', borderColor: 'red', color: 'red' }} onClick={() => handleUpdateStatus('new_amoreja_journal_articles', art, 'rejected')}>Rejeitar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={{ marginTop: '40px' }}>
            <h3>Eventos Pendentes ({pendingEvents.length})</h3>
            {pendingEvents.length === 0 ? (
              <p>Nenhum evento pendente.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Colunista</th>
                    <th>Evento</th>
                    <th>Data e Hora</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEvents.map(evt => (
                    <tr key={evt.id}>
                      <td>{evt.new_amoreja_profiles?.full_name || 'Desconhecido'}</td>
                      <td>{evt.title}</td>
                      <td>{new Date(evt.event_date).toLocaleString()}</td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleUpdateStatus('new_amoreja_journal_events', evt, 'approved')}>Aprovar</button>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px', borderColor: 'red', color: 'red' }} onClick={() => handleUpdateStatus('new_amoreja_journal_events', evt, 'rejected')}>Rejeitar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      {activeTab === 'approved' && (
        <>
          <section style={{ marginTop: '30px' }}>
            <h3>Matérias no Ar ({approvedArticles.length})</h3>
            {approvedArticles.length === 0 ? (
              <p>Nenhuma matéria aprovada.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Colunista</th>
                    <th>Título</th>
                    <th>Validade</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedArticles.map(art => (
                    <tr key={art.id}>
                      <td>{art.new_amoreja_profiles?.full_name || 'Desconhecido'}</td>
                      <td>{art.title}</td>
                      <td>{new Date(art.start_date).toLocaleDateString()} a {new Date(art.end_date).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px', borderColor: '#d93025', color: '#d93025' }} onClick={() => handleUpdateStatus('new_amoreja_journal_articles', art, 'archived')}>Retirar do Ar (Arquivar)</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={{ marginTop: '40px' }}>
            <h3>Eventos no Ar ({approvedEvents.length})</h3>
            {approvedEvents.length === 0 ? (
              <p>Nenhum evento aprovado.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Colunista</th>
                    <th>Evento</th>
                    <th>Data e Hora</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedEvents.map(evt => (
                    <tr key={evt.id}>
                      <td>{evt.new_amoreja_profiles?.full_name || 'Desconhecido'}</td>
                      <td>{evt.title}</td>
                      <td>{new Date(evt.event_date).toLocaleString()}</td>
                      <td>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px', borderColor: '#d93025', color: '#d93025' }} onClick={() => handleUpdateStatus('new_amoreja_journal_events', evt, 'rejected')}>Remover Calendário</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
