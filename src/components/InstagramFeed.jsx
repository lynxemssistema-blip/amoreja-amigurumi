import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { ExternalLink } from 'lucide-react';
import Instagram from './InstagramIcon';
import './InstagramFeed.css';

// Fallbacks de alta qualidade de Amigurumis para garantir que nenhuma imagem fique em branco
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1584992791193-5dec183a2198?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1562040506-a9b32cb51b94?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1605007493699-af65834f8a00?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=600&auto=format&fit=crop&q=80'
];

const MOCK_INSTAGRAM_POSTS = [
  {
    id: 'mock-1',
    post_url: 'https://www.instagram.com/amorejaamigurumi/p/DZCnocTDhSp/',
    caption: 'MARATONA DE AMIGURUMIS | FESTIVAL DAS ESTAÇÕES ❄☀️🌸🍂 a 2ª edição chegou com 20 designers maravilhosas!',
    image_url: FALLBACK_IMAGES[0]
  },
  {
    id: 'mock-2',
    post_url: 'https://www.instagram.com/amorejaamigurumi/p/DZ42Efrjh9M/',
    caption: 'Gigi Love - Girafinha amigurumi por @fofinhosamigurumi. Em breve disponível no festival!',
    image_url: FALLBACK_IMAGES[1]
  },
  {
    id: 'mock-3',
    post_url: 'https://www.instagram.com/amorejaamigurumi/p/DZh4ZY9jr1h/',
    caption: 'Designers da Maratona de Amigurumis - Conheça a Marcia Reggiani e sua história de amor por pontos!',
    image_url: FALLBACK_IMAGES[2]
  },
  {
    id: 'mock-4',
    post_url: 'https://www.instagram.com/amorejaamigurumi/reel/DaOM6dxj457/',
    caption: 'Sorteio 30/06 - Ganhadores revelados na live. Agradecemos a participação de todas!',
    image_url: FALLBACK_IMAGES[3]
  }
];

export default function InstagramFeed() {
  const [posts, setPosts] = useState([]);
  const [config, setConfig] = useState({
    visible: true,
    title: 'Nosso Feed do Instagram',
    subtitle: 'Siga-nos @amorejaamigurumi e acompanhe as novidades!',
    handle: '@amorejaamigurumi',
    instagram_url: 'https://www.instagram.com/amorejaamigurumi/'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured()) {
        setPosts(MOCK_INSTAGRAM_POSTS);
        setLoading(false);
        return;
      }

      try {
        // 1. Carregar configuração de visibilidade e textos da seção
        const { data: contentData } = await supabase
          .from('new_amoreja_site_content')
          .select('*')
          .eq('section_key', 'instagram_feed')
          .maybeSingle();

        if (contentData) {
          const extra = contentData.extra_data || {};
          setConfig({
            visible: extra.visible !== false,
            title: contentData.title || 'Nosso Feed do Instagram',
            subtitle: contentData.subtitle || 'Siga-nos @amorejaamigurumi e acompanhe as novidades!',
            handle: extra.handle || '@amorejaamigurumi',
            instagram_url: extra.instagram_url || 'https://www.instagram.com/amorejaamigurumi/'
          });
        }

        // 2. Carregar posts do Instagram
        const { data: postsData, error: postsError } = await supabase
          .from('new_amoreja_instagram_posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        if (postsData && postsData.length > 0) {
          const sanitizedPosts = postsData.map((post, idx) => {
            const hasValidImg = post.image_url && post.image_url.trim() !== '';
            const isCdn = hasValidImg && (post.image_url.includes('cdninstagram.com') || post.image_url.includes('fbcdn.net'));
            
            return {
              ...post,
              image_url: (!hasValidImg || isCdn)
                ? FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]
                : post.image_url
            };
          });
          setPosts(sanitizedPosts);
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

    fetchData();
  }, []);

  // Se a seção estiver desativada/oculta pelo painel de controle, não renderiza nada
  if (!config.visible) {
    return null;
  }

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
        <h2 className="instagram-title">{config.title}</h2>
        <p className="instagram-subtitle">
          Siga-nos{' '}
          <a href={config.instagram_url} target="_blank" rel="noopener noreferrer">
            {config.handle}
          </a>{' '}
          e acompanhe as novidades!
        </p>
      </div>

      <div className="instagram-grid">
        {posts.map((post, idx) => (
          <a 
            key={post.id || idx} 
            href={post.post_url || config.instagram_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="instagram-item"
          >
            <img 
              src={post.image_url || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]} 
              alt={post.caption || "Instagram Post"} 
              className="instagram-img"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
              }}
            />
            <div className="instagram-overlay">
              <Instagram className="overlay-icon-ig" size={24} />
              <p className="overlay-caption">{post.caption || 'Ver publicação no Instagram'}</p>
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
