import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';

export default function JournalArticle({ article, isMainArticle }) {
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

  return (
    <article className={`journal-article layout-${article.layout_model} ${isMainArticle ? 'main-article' : ''}`}>
      {article.cover_image && (
        <div className="article-image-wrapper">
          <img src={article.cover_image} alt={article.title} className="article-image" />
        </div>
      )}
      
      <div className="article-text">
        <h2 className="article-headline">{article.title}</h2>
        {article.subtitle && <h3 className="article-subheadline">{article.subtitle}</h3>}
        
        <div className="article-byline">
          Por <strong>{article.new_amoreja_profiles?.full_name || 'Equipe Amoreja'}</strong>
        </div>
        
        <div className="article-body">
          {article.content.split('\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        
        {article.social_links && article.social_links.length > 0 && (
          <div className="article-socials">
            {article.social_links.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noreferrer">Ver mais no {link.platform || 'Instagram'}</a>
            ))}
          </div>
        )}
      </div>

      {/* Seção de Interações (Curtidas e Comentários) */}
      <div className="article-interactions" style={{ marginTop: '25px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '15px' }}>
          
          <button 
            onClick={() => handleVote('like')} 
            disabled={userVoted}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: userVoted ? 'default' : 'pointer', color: userVoted ? '#999' : '#059669', fontSize: '1rem' }}
          >
            <ThumbsUp size={18} /> Gostei ({likes})
          </button>
          
          <button 
            onClick={() => handleVote('dislike')} 
            disabled={userVoted}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: userVoted ? 'default' : 'pointer', color: userVoted ? '#999' : '#ea7458', fontSize: '1rem' }}
          >
            <ThumbsDown size={18} /> Não Gostei ({dislikes})
          </button>

          <button 
            onClick={handleToggleComments}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', marginLeft: 'auto', fontSize: '1rem' }}
          >
            <MessageCircle size={18} /> Comentários
          </button>
        </div>

        {/* Accordion de Comentários */}
        {showComments && (
          <div className="comments-section" style={{ background: '#f8fafc', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            
            {user ? (
              <form onSubmit={handlePostComment} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Deixe um comentário..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" disabled={!newComment.trim()}>Enviar</button>
              </form>
            ) : (
              <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#64748b' }}>
                <a href="/login" style={{ color: '#0369a1', textDecoration: 'underline' }}>Faça login</a> para deixar um comentário.
              </div>
            )}

            {loadingComments ? (
              <p style={{ fontSize: '0.9rem', color: '#666' }}>Carregando comentários...</p>
            ) : comments.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>Nenhum comentário ainda. Seja o primeiro!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {comments.map(c => (
                  <div key={c.id} style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ display: 'block', fontSize: '0.9rem', color: '#334155', marginBottom: '4px' }}>
                      {c.new_amoreja_profiles?.full_name || 'Usuário'}
                    </strong>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569' }}>{c.content}</p>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                      {new Date(c.created_at).toLocaleString()}
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
