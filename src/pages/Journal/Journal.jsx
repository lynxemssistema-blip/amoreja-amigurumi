import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import CalendarWidget from './CalendarWidget';
import JournalArticle from './JournalArticle';
import './Journal.css';

export default function Journal() {
  const [articles, setArticles] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [journalName, setJournalName] = useState('Amoreja Diário');
  
  const ARTICLES_PER_PAGE = 4; // Ajuste para caber bem numa página de jornal
  const MAX_PAGES = 5;

  useEffect(() => {
    fetchJournalData();
  }, []);

  async function fetchJournalData() {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      // MOCK DATA PARA MODO DEMONSTRAÇÃO
      setTimeout(() => {
        setArticles([
          {
            id: 'mock-art-1',
            title: 'Boas Vindas ao Jornal Amoreja!',
            subtitle: 'O lugar onde as artesãs compartilham suas histórias.',
            content: '<p>Este é um artigo de exemplo. Se você está vendo isso, o sistema está rodando em <strong>Modo Demo</strong> (sem banco de dados configurado). Para ver matérias reais, conecte o Supabase.</p>',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 86400000 * 30).toISOString(),
            status: 'approved',
            new_amoreja_profiles: { full_name: 'Amoreja Equipe' },
            likes_count: 12,
            dislikes_count: 0
          }
        ]);
        setEvents([
          {
            id: 'mock-evt-1',
            title: 'Maratona Amigurumi',
            description: 'Evento online de criação.',
            event_date: new Date(Date.now() + 86400000 * 5).toISOString(),
            status: 'approved'
          }
        ]);
        setLoading(false);
      }, 800);
      return;
    }

    try {
      const today = new Date().toISOString();
      
      // Busca matérias aprovadas e dentro da validade
      const { data: articlesData, error: errArt } = await supabase
        .from('new_amoreja_journal_articles')
        .select(`*, new_amoreja_profiles (full_name)`)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(ARTICLES_PER_PAGE * MAX_PAGES);

      if (errArt) throw errArt;

      // Busca eventos futuros aprovados
      const { data: eventsData, error: errEvt } = await supabase
        .from('new_amoreja_journal_events')
        .select('*')
        .eq('status', 'approved')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(5);

      if (errEvt) throw errEvt;

      // Busca o nome do jornal
      const { data: settings } = await supabase
        .from('new_amoreja_settings')
        .select('value')
        .eq('key', 'journal_name')
        .single();

      if (settings && settings.value) {
        setJournalName(settings.value);
      }

      setArticles(articlesData || []);
      setEvents(eventsData || []);
    } catch (err) {
      console.error("Erro ao buscar dados do jornal:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.min(Math.ceil(articles.length / ARTICLES_PER_PAGE), MAX_PAGES);
  
  const currentArticles = articles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE
  );

  if (loading) {
    return <div className="journal-loading">Preparando a edição de hoje...</div>;
  }

  return (
    <div className="journal-page">
      <div className="journal-container">
        
        {/* Barra Superior de Metadados */}
        <div className="journal-top-bar">
          <span>@jornaldoamigurumi</span>
          <span style={{ fontWeight: 800 }}>JORNAL COLABORATIVO</span>
          <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
        </div>

        {/* Cabeçalho Principal do Jornal */}
        <header className="journal-header">
          <div className="journal-seal-row">
            <div className="journal-circle-seal">
              <span>JORNAL</span>
              <span style={{ fontSize: '13px' }}>🧶</span>
              <span>AMIGURUMI</span>
            </div>

            <h1 className="journal-title">{journalName}</h1>

            <div className="journal-edition-badge">
              <strong>GUIA & EDIÇÃO DIGITAL</strong>
              <span>ED. 001/26</span>
            </div>
          </div>

          <div className="journal-motto-strip">
            "Mais do que criar receitas, eu escolhi criar movimentos que fortalecem pessoas."
          </div>
        </header>

        {/* Corpo do Jornal */}
        <div className="journal-content-wrapper">
          {currentPage === 1 && events.length > 0 && (
            <aside className="journal-sidebar">
              <CalendarWidget events={events} />
            </aside>
          )}

          <main className="journal-main-articles">
            {currentArticles.length === 0 ? (
              <div className="journal-empty">
                <h2>Sem notícias hoje!</h2>
                <p>Nossos colunistas estão preparando novas matérias.</p>
                <Link to="/jornal/arquivo" className="btn btn-outline" style={{marginTop: '20px'}}>
                  Ver Edições Anteriores
                </Link>
              </div>
            ) : (
              <div className="articles-grid">
                {currentArticles.map((article, index) => (
                  <JournalArticle 
                    key={article.id} 
                    article={article} 
                    isMainArticle={index === 0 && currentPage === 1} 
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        {/* Paginação do Jornal */}
        {totalPages > 1 && (
          <div className="journal-pagination">
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Página Anterior
            </button>
            <span className="page-indicator">Página {currentPage} de {totalPages}</span>
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Próxima Página
            </button>
          </div>
        )}

        <div className="journal-footer-links">
          <Link to="/jornal/arquivo">Pesquisar no Arquivo (Edições Anteriores)</Link>
        </div>
      </div>
    </div>
  );
}
