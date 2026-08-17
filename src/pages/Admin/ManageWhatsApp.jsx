import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { Plus, Trash, ShieldAlert, CheckCircle, MessageCircle } from 'lucide-react';
import './ManageWhatsApp.css'; // Will create this next or use inline styles for now

export default function ManageWhatsApp() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form
  const [jid, setJid] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('contact');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('new_amoreja_wa_contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (err) {
      console.error(err.message);
      setErrorMsg("Erro ao carregar contatos.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrorMsg('');

    if (!jid || !name) {
      setErrorMsg("JID e Nome são obrigatórios.");
      return;
    }

    let finalJid = jid.trim();
    // Helper to format JID if user just types number
    if (!finalJid.includes('@')) {
      if (type === 'group') {
        finalJid = finalJid + '@g.us';
      } else {
        finalJid = finalJid + '@s.whatsapp.net';
      }
    }

    try {
      const { error } = await supabase
        .from('new_amoreja_wa_contacts')
        .insert([{ jid: finalJid, name, type }]);

      if (error) throw error;
      
      setMessage('Contato/Grupo adicionado com sucesso!');
      setJid('');
      setName('');
      loadContacts();
    } catch (err) {
      if (err.code === '23505') {
        setErrorMsg('Esse JID já está cadastrado.');
      } else {
        setErrorMsg("Erro ao adicionar: " + err.message);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remover este contato? Ele deixará de ser monitorado pela IA.")) return;
    try {
      const { error } = await supabase.from('new_amoreja_wa_contacts').delete().eq('id', id);
      if (error) throw error;
      setMessage('Contato removido!');
      loadContacts();
    } catch (err) {
      setErrorMsg("Erro ao remover: " + err.message);
    }
  };

  return (
    <div className="manage-whatsapp-container">
      <div className="admin-page-header">
        <h2>WhatsApp CRM (Configuração de Monitoramento)</h2>
      </div>

      <div className="instagram-explanation-card" style={{ marginBottom: '20px' }}>
        <ShieldAlert size={20} className="info-icon" />
        <div>
          <h4>Como o Agente IA escolhe quem ouvir?</h4>
          <p>
            O robô ignorará todo mundo, <strong>exceto</strong> os contatos e grupos cadastrados nesta lista. 
            Para adicionar um contato, coloque o número com DDD (ex: 5531999522412). Para grupos, você precisa colocar o ID interno do WhatsApp (algo como 120363@g.us).
          </p>
        </div>
      </div>

      {message && <div className="alert alert-success"><CheckCircle size={14} /> {message}</div>}
      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

      <div className="product-form-card" style={{ marginBottom: '30px' }}>
        <div className="form-header">
          <h3>Adicionar Novo Monitoramento</h3>
        </div>
        <form onSubmit={handleAdd} className="admin-form">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nome / Apelido</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ex: Grupo de Tricô, ou João"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Número ou JID</label>
              <input 
                type="text" 
                className="form-control" 
                value={jid} 
                onChange={(e) => setJid(e.target.value)} 
                placeholder="Ex: 5531999522412"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-control" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="contact">Contato Individual</option>
                <option value="group">Grupo</option>
              </select>
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: '15px' }}>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </form>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Número / JID</th>
              <th>Tipo</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center text-muted" style={{ padding: '20px' }}>
                  Nenhum contato monitorado ainda.
                </td>
              </tr>
            ) : (
              contacts.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td className="font-mono text-muted">{c.jid}</td>
                  <td>
                    <span className={`badge ${c.type === 'group' ? 'badge-avancado' : 'badge-facil'}`}>
                      {c.type === 'group' ? 'Grupo' : 'Contato'}
                    </span>
                  </td>
                  <td className="text-right actions-cell">
                    <button 
                      onClick={() => handleDelete(c.id)} 
                      className="btn-action-icon delete" 
                      title="Excluir"
                    >
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
