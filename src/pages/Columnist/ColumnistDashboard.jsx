import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
import ArticleEditor from './ArticleEditor';
import './ColumnistDashboard.css';

export default function ColumnistDashboard() {
  const { user, isColumnist, isAdmin, loading: authLoading } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('list'); // 'list' | 'editor'
  const [editingArticle, setEditingArticle] = useState(null);

  useEffect(() => {
    if (user && (isColumnist || isAdmin)) {
      fetchMyArticles();
    }
  }, [user, isColumnist, isAdmin]);

  const fetchMyArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('new_amoreja_journal_articles')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error('Erro ao buscar matérias:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingArticle(null);
    setCurrentView('editor');
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setCurrentView('editor');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    fetchMyArticles();
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loader"></div>
        <p style={{ color: '#64748b' }}>Carregando painel de colunista...</p>
      </div>
    );
  }

  if (!isColumnist && !isAdmin) {
    return (
      <div className="container" style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar o painel de colunista.</p>
      </div>
    );
  }

  return (
    <div className="columnist-dashboard-page">
      <div className="container">
        {currentView === 'list' ? (
          <>
            <div className="dashboard-header">
              <div>
                <h2>Área do Colunista</h2>
                <p>Gerencie suas matérias do Jornal Amoreja.</p>
              </div>
              <button className="btn btn-primary" onClick={handleCreateNew}>
                ✏️ Escrever Nova Matéria
              </button>
            </div>

            <div className="articles-list">
              <h3>Minhas Matérias</h3>
              {loading ? (
                <p>Carregando matérias...</p>
              ) : articles.length === 0 ? (
                <div className="empty-state">
                  <p>Você ainda não escreveu nenhuma matéria.</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Data de Início</th>
                      <th>Validade</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map(article => (
                      <tr key={article.id}>
                        <td>{article.title}</td>
                        <td>{new Date(article.start_date).toLocaleDateString()}</td>
                        <td>{new Date(article.end_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge status-${article.status}`}>
                            {article.status === 'approved' ? '✅ Aprovada' : 
                             article.status === 'pending' ? '⏳ Pendente' : 
                             article.status === 'rejected' ? '❌ Rejeitada' : '📁 Arquivada'}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            onClick={() => handleEdit(article)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <ArticleEditor 
            article={editingArticle} 
            onBack={handleBackToList} 
            user={user}
          />
        )}
      </div>
    </div>
  );
}
