import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ThumbsUp, ThumbsDown, MessageCircle, Share2, Sparkles, ExternalLink } from 'lucide-react';
import DOMPurify from 'dompurify';

export default function JournalArticle({ article, isMainArticle, template }) {
  const { user } = useAuth();
  
  const [likes, setLikes] = useState(article.likes_count || 0);
  const [dislikes, setDislikes] = useState(article.dislikes_count || 0);
  const [userVoted, setUserVoted] = useState(false);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    const voted = localStorage.getItem(`voted_article_${article.id}`);
    if (voted) setUserVoted(true);
  }, [article.id]);

  const handleVote = async (type) => {
    if (userVoted) return;

    const newLikes = type === 'like' ? likes + 1 : likes;
    const newDislikes = type === 'dislike' ? dislikes + 1 : dislikes;

    setLikes(newLikes);
    setDislikes(newDislikes);
    setUserVoted(true);
    localStorage.setItem(`voted_article_${article.id}`, type);

    try {
      await supabase
        .from('new_amoreja_journal_articles')
        .update({ 
          likes_count: newLikes, 
          dislikes_count: newDislikes 
        })
        .eq('id', article.id);
    } catch (err) {
      console.error('Erro ao registrar voto:', err);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('new_amoreja_journal_comments')
        .select(`*, new_amoreja_profiles(full_name, avatar_url)`)
        .eq('article_id', article.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Erro ao carregar comentários:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from('new_amoreja_journal_comments')
        .insert([{
          article_id: article.id,
          user_id: user.id,
          content: newComment.trim()
        }])
        .select(`*, new_amoreja_profiles(full_name, avatar_url)`);

      if (error) throw error;
      
      setComments([data[0], ...comments]);
      setNewComment('');
    } catch (err) {
      console.error('Erro ao postar comentário:', err);
      alert('Falha ao enviar comentário.');
    }
  };

  const authorName = article.new_amoreja_profiles?.full_name || 'Equipe Amoreja';
  const authorAvatar = article.new_amoreja_profiles?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200';
  const authorInstagram = article.new_amoreja_profiles?.instagram_handle || '@amorejaamigurumi';

  return (
    <article className={`journal-article layout-${article.layout_model || 'classic'} ${isMainArticle ? 'main-article' : ''}`}>
      
      {/* Faixa do Colunista & Citação Fiel à Página 5 */}
      <div className="article-author-strip">
        <div className="author-badge-group">
          <img src={authorAvatar} alt={authorName} className="author-avatar-thumb" />
          <div className="author-badge-meta">
            <strong className="author-badge-name">{authorName}</strong>
            <span className="author-badge-handle">{authorInstagram}</span>
          </div>
        </div>
        <div className="author-quote-badge">
          "Mais do que criar receitas, eu escolhi criar movimentos que fortalecem pessoas."
        </div>
      </div>

      {/* Título Principal & Subtítulo Caligráfico */}
      <div className="article-title-block">
        <h2 className="article-headline">{article.title}</h2>
        {article.subtitle && (
          <div className="article-calligraphy-subtitle">
            {article.subtitle}
          </div>
        )}
      </div>

      {/* Imagem de Capa */}
      {article.cover_image && (
        <div className="article-image-wrapper">
          <img src={article.cover_image} alt={article.title} className="article-image" />
        </div>
      )}
      
      {/* Corpo da Matéria em Colunas de Jornal */}
      <div className="article-text-container">
        <div 
          className="article-body"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content.replace(/\n/g, '<br />')) }}
        />
        
        {article.social_links && article.social_links.length > 0 && (
          <div className="article-socials">
            {article.social_links.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noreferrer" className="article-social-link">
                <ExternalLink size={14} /> Ver mais no {link.platform || 'Canal'}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Bloco de Expediente & Equipe Editorial */}
      <div className="article-editorial-footer-box">
        <div className="editorial-credit-item">
          <span className="editorial-credit-label">IDEALIZAÇÃO, PREPARAÇÃO E ORGANIZAÇÃO</span>
          <strong className="editorial-credit-name">Marcia Reggiani</strong>
          <span className="editorial-credit-handle">@amorejaamigurumi</span>
        </div>
        <div className="editorial-credit-item">
          <span className="editorial-credit-label">EDIÇÃO DE TEXTOS E REVISÃO</span>
          <strong className="editorial-credit-name">Cíntia Ferrer</strong>
          <span className="editorial-credit-handle">@micajitadesuenos</span>
        </div>
        <div className="editorial-credit-item">
          <span className="editorial-credit-label">CONTATOS OFICIAIS</span>
          <span className="editorial-credit-info">WhatsApp: (31) 99952.2412</span>
          <span className="editorial-credit-info">Grupo para designers</span>
        </div>
      </div>

      {/* Seção de Interações (Curtidas e Comentários) */}
      <div className="article-interactions">
        <div className="interactions-bar">
          <button 
            onClick={() => handleVote('like')} 
            disabled={userVoted}
            className={`btn-vote like ${userVoted ? 'voted' : ''}`}
          >
            <ThumbsUp size={16} /> Gostei ({likes})
          </button>
          
          <button 
            onClick={() => handleVote('dislike')} 
            disabled={userVoted}
            className={`btn-vote dislike ${userVoted ? 'voted' : ''}`}
          >
            <ThumbsDown size={16} /> Não Gostei ({dislikes})
          </button>

          <button 
            onClick={handleToggleComments}
            className="btn-toggle-comments"
          >
            <MessageCircle size={16} /> Comentários ({comments.length})
          </button>
        </div>

        {/* Accordion de Comentários */}
        {showComments && (
          <div className="comments-section">
            {user ? (
              <form onSubmit={handlePostComment} className="comment-form">
                <input 
                  type="text" 
                  className="form-control comment-input" 
                  placeholder="Escreva seu comentário respeitoso..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={!newComment.trim()}>Enviar</button>
              </form>
            ) : (
              <div className="comment-login-hint">
                <Link to="/login">Faça login</Link> para deixar um comentário.
              </div>
            )}

            {loadingComments ? (
              <p className="comment-loading">Carregando comentários...</p>
            ) : comments.length === 0 ? (
              <p className="comment-empty">Nenhum comentário ainda. Seja a primeira a participar!</p>
            ) : (
              <div className="comment-list">
                {comments.map(c => (
                  <div key={c.id} className="comment-card">
                    <strong className="comment-author">
                      {c.new_amoreja_profiles?.full_name || 'Artesã Leitora'}
                    </strong>
                    <p className="comment-text">{c.content}</p>
                    <span className="comment-date">
                      {new Date(c.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </article>
  );
}
