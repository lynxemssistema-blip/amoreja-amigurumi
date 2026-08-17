import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { ExternalLink } from 'lucide-react';
import Instagram from './InstagramIcon';
import './InstagramFeed.css';

// Mock de postagens do Instagram caso não consiga ler do Supabase
const MOCK_INSTAGRAM_POSTS = [
  {
    id: 'mock-1',
    post_url: 'https://www.instagram.com/amorejaamigurumi/p/DZCnocTDhSp/',
    caption: 'MARATONA DE AMIGURUMIS | FESTIVAL DAS ESTAÇÕES ❄☀️🌸🍂 a 2ª edição chegou com 20 designers maravilhosas!',
    image_url: 'https://images.unsplash.com/photo-1584992791193-5dec183a2198?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'mock-2',
    post_url: 'https://www.instagram.com/amorejaamigurumi/p/DZ42Efrjh9M/',
    caption: 'Gigi Love - Girafinha amigurumi por @fofinhosamigurumi. Em breve disponível no festival!',
    image_url: 'https://images.unsplash.com/photo-1562040506-a9b32cb51b94?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'mock-3',
    post_url: 'https://www.instagram.com/amorejaamigurumi/p/DZh4ZY9jr1h/',
    caption: 'Designers da Maratona de Amigurumis - Conheça a Marcia Reggiani e sua história de amor por pontos!',
    image_url: 'https://images.unsplash.com/photo-1605007493699-af65834f8a00?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'mock-4',
    post_url: 'https://www.instagram.com/amorejaamigurumi/reel/DaOM6dxj457/',
    caption: 'Sorteio 30/06 - Ganhadores revelados na live. Agradecemos a participação de todas!',
    image_url: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=600&auto=format&fit=crop&q=80'
  }
];

export default function InstagramFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!isSupabaseConfigured()) {
        setPosts(MOCK_INSTAGRAM_POSTS);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('new_amoreja_instagram_posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setPosts(data);
        } else {
          setPosts(MOCK_INSTAGRAM_POSTS);
        }
      } catch (err) {
        console.error("Erro ao carregar feed do Instagram:", err.message);
        setPosts(MOCK_INSTAGRAM_POSTS);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="instagram-loading">
        <div className="loader"></div>
        <p>Carregando feed do Instagram...</p>
      </div>
    );
  }

  return (
    <div className="instagram-feed-section">
      <div className="instagram-header">
        <Instagram className="instagram-title-icon" size={32} />
        <h2 className="instagram-title">Nosso Feed do Instagram</h2>
        <p className="instagram-subtitle">
          Siga-nos <a href="https://www.instagram.com/amorejaamigurumi/" target="_blank" rel="noopener noreferrer">@amorejaamigurumi</a> e acompanhe as novidades!
        </p>
      </div>

      <div className="instagram-grid">
        {posts.map((post) => (
          <a 
            key={post.id} 
            href={post.post_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="instagram-item"
          >
            <img src={post.image_url} alt="Instagram Post" className="instagram-img" />
            <div className="instagram-overlay">
              <Instagram className="overlay-icon-ig" size={24} />
              <p className="overlay-caption">{post.caption}</p>
              <span className="overlay-link-hint">
                Ver no Instagram <ExternalLink size={12} />
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
