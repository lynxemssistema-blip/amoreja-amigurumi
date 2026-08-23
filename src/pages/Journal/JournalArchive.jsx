import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './Journal.css';

export default function JournalArchive() {
  const [articles, setArticles] = useState([]);
  const [searchYear, setSearchYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [journalName, setJournalName] = useState('Amoreja Diário');

  useEffect(() => {
    fetchArchive();
  }, []);

  const fetchArchive = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString();
      
      // Busca matérias aprovadas mas que a data de validade já expirou
      const { data, error } = await supabase
        .from('new_amoreja_journal_articles')
        .select(`*, new_amoreja_profiles (full_name)`)
        .eq('status', 'approved')
        .lt('end_date', today)
        .order('end_date', { ascending: false });

      if (error) throw error;
      setArticles(data || []);

      // Busca o nome do jornal
      const { data: settings } = await supabase
        .from('new_amoreja_settings')
        .select('value')
        .eq('key', 'journal_name')
        .single();

      if (settings && settings.value) {
        setJournalName(settings.value);
      }
    } catch (err) {
      console.error("Erro ao buscar arquivo:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="journal-page"><div className="journal-container">Buscando nos arquivos...</div></div>;

  return (
    <div className="journal-page">
      <div className="journal-container">
        {/* Cabeçalho do Jornal */}
        <header className="journal-header">
          <div className="journal-meta">
            <span>ARQUIVO DIGITAL</span>
            <span>Pesquisa de Edições</span>
          </div>
          <h1 className="journal-title">{journalName}</h1>
          <div className="journal-meta-bottom">
            <span>Acervo de Memórias</span>
          </div>
        </header>

        {articles.length === 0 ? (
          <p>O arquivo está vazio no momento.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
            {articles.map(article => (
              <div key={article.id} style={{ border: '1px solid #e0d5c1', padding: '20px', background: 'white' }}>
                <h3 style={{ margin: '0 0 10px 0', fontFamily: 'Georgia, serif' }}>{article.title}</h3>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '15px' }}>
                  Publicado até {new Date(article.end_date).toLocaleDateString()}
                </p>
                <p style={{ fontSize: '0.9rem' }}>{article.subtitle || article.content.substring(0, 100) + '...'}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <Link to="/jornal" className="btn btn-outline">Voltar para a Edição Atual</Link>
        </div>
      </div>
    </div>
  );
}
