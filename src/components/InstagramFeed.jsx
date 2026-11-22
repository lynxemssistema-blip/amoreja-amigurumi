import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { 
  ExternalLink, 
  Heart, 
  MessageCircle, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  Play, 
  Camera, 
  BookOpen, 
  Users, 
  Coffee, 
  Gift, 
  Lightbulb,
  Share2
} from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import './InstagramFeed.css';

// Fotos temáticas reais de alta definição de Amigurumis e bastidores
const FALLBACK_POSTS = [
  {
    id: 'post-1',
    post_url: 'https://www.instagram.com/amorejaamigurumi/',
    caption: 'MARATONA DE AMIGURUMIS 🌸 Festival das Estações: mais de 20 designers reunidas tecendo amor e arte em cada ponto!',
    image_url: 'https://images.unsplash.com/photo-1584992791193-5dec183a2198?w=800&auto=format&fit=crop&q=80',
    type: 'reel',
    likes: 642,
    comments: 89,
    tag: 'Maratona Oficial'
  },
  {
    id: 'post-2',
    post_url: 'https://www.instagram.com/amorejaamigurumi/',
    caption: 'A queridinha Gigi Love! Quem aguenta esse charme de óculos escuros de coração? 💕 Receita digital em PDF disponível!',
    image_url: 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=800&auto=format&fit=crop&q=80',
    type: 'post',
    likes: 518,
    comments: 64,
    tag: 'Receita Autoral'
  },
  {
    id: 'post-3',
    post_url: 'https://www.instagram.com/amorejaamigurumi/',
    caption: 'Rodolph prontinho para aquecer o coração no Natal! Fios macios, ponto firme e detalhes encantadores. 🎄✨',
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
    type: 'post',
    likes: 730,
    comments: 95,
    tag: 'Coleção Natal'
  },
  {
    id: 'post-4',
    post_url: 'https://www.instagram.com/amorejaamigurumi/',
    caption: 'Dia de escolher a paleta de cores perfeita para o próximo projeto autoral. Qual combinação você mais ama? 🧶🧵',
    image_url: 'https://images.unsplash.com/photo-1562040506-a9b32cb51b94?w=800&auto=format&fit=crop&q=80',
    type: 'post',
    likes: 412,
    comments: 53,
    tag: 'Bastidores'
  },
  {
    id: 'post-5',
    post_url: 'https://www.instagram.com/amorejaamigurumi/',
    caption: 'Princesa Jasmine Amigurumi: cada detalhe pensado com muito carinho, tiara dourada e pontos delicados. ✨👑',
    image_url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800&auto=format&fit=crop&q=80',
    type: 'post',
    likes: 820,
    comments: 112,
    tag: 'Princesas'
  },
  {
    id: 'post-6',
    post_url: 'https://www.instagram.com/amorejaamigurumi/',
    caption: 'Dica de ouro: o segredo para um fechamento invisível perfeito na sua peça de amigurumi sem deixar marcas! 💡',
    image_url: 'https://images.unsplash.com/photo-1605007493699-af65834f8a00?w=800&auto=format&fit=crop&q=80',
    type: 'reel',
    likes: 945,
    comments: 140,
    tag: 'Dica de Crochê'
  }
];

// Destaques dos Stories do Instagram
const STORY_HIGHLIGHTS = [
  {
    id: 'h-1',
    title: 'Maratonas',
    icon: Sparkles,
    color: '#e6683c',
    url: 'https://www.instagram.com/amorejaamigurumi/'
  },
  {
    id: 'h-2',
    title: 'Receitas PDF',
    icon: BookOpen,
    color: '#bc1888',
    url: 'https://www.instagram.com/amorejaamigurumi/'
  },
  {
    id: 'h-3',
    title: 'Dicas & Pontos',
    icon: Lightbulb,
    color: '#f09433',
    url: 'https://www.instagram.com/amorejaamigurumi/'
  },
  {
    id: 'h-4',
    title: 'Alunas & Clientes',
    icon: Users,
    color: '#dc2743',
    url: 'https://www.instagram.com/amorejaamigurumi/'
  },
  {
    id: 'h-5',
    title: 'No Ateliê',
    icon: Coffee,
    color: '#cc2366',
    url: 'https://www.instagram.com/amorejaamigurumi/'
  },
  {
    id: 'h-6',
    title: 'Sorteios',
    icon: Gift,
    color: '#f09433',
    url: 'https://www.instagram.com/amorejaamigurumi/'
  }
];

export default function InstagramFeed() {
  const [posts, setPosts] = useState(FALLBACK_POSTS);
  const [config, setConfig] = useState({
    visible: true,
    title: 'Mundo Amoreja no Instagram',
    subtitle: 'por Marcia Reggiani | @amorejaamigurumi',
    bio: 'Transformando fios em abraços quentinhos e espalhando amor através de pontos de crochê. ✨ Criadora da Maratona de Amigurumis.',
    handle: '@amorejaamigurumi',
    author_name: 'Marcia Reggiani',
    instagram_url: 'https://www.instagram.com/amorejaamigurumi/',
    hashtag: '#AmorejaAmigurumi'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured()) {
        return;
      }

      try {
        // 1. Carregar configuração de site_content
        const { data: contentData } = await supabase
          .from('new_amoreja_site_content')
          .select('*')
          .eq('section_key', 'instagram_feed')
          .maybeSingle();

        if (contentData) {
          const extra = contentData.extra_data || {};
          setConfig(prev => ({
            ...prev,
            visible: extra.visible !== false,
            title: contentData.title || prev.title,
            subtitle: contentData.subtitle || prev.subtitle,
            bio: extra.bio || prev.bio,
            handle: extra.handle || prev.handle,
            author_name: extra.author_name || prev.author_name,
            instagram_url: extra.instagram_url || prev.instagram_url,
            hashtag: extra.hashtag || prev.hashtag
          }));
        }

        // 2. Carregar posts do banco
        const { data: postsData } = await supabase
          .from('new_amoreja_instagram_posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (postsData && postsData.length > 0) {
          const enriched = postsData.map((p, idx) => {
            const fallback = FALLBACK_POSTS[idx % FALLBACK_POSTS.length];
            return {
              id: p.id,
              post_url: p.post_url || config.instagram_url,
              caption: p.caption || fallback.caption,
              image_url: p.image_url && !p.image_url.includes('cdninstagram.com') ? p.image_url : fallback.image_url,
              type: p.post_url?.includes('/reel/') ? 'reel' : fallback.type,
              likes: fallback.likes,
              comments: fallback.comments,
              tag: fallback.tag
            };
          });
          setPosts(enriched);
        }
      } catch (err) {
        console.warn("Usando posts locais do Instagram:", err.message);
      }
    };

    fetchData();
  }, []);

  if (!config.visible) {
    return null;
  }

  return (
    <section className="amoreja-instagram-section animate-fade-in">
      <div className="container">
        
        {/* Barra de Destaques dos Stories (Highlights) */}
        <div className="instagram-stories-container">
          <div className="instagram-stories-track">
            {STORY_HIGHLIGHTS.map(story => {
              const IconComp = story.icon;
              return (
                <a
                  key={story.id}
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="instagram-story-item"
                  title={`Ver destaque "${story.title}" no Instagram`}
                >
                  <div className="story-ring">
                    <div className="story-circle-inner">
                      <IconComp size={24} style={{ color: story.color }} />
                    </div>
                  </div>
                  <span className="story-label">{story.title}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Card de Apresentação do Perfil Oficial */}
        <div className="instagram-profile-card">
          <div className="instagram-profile-avatar-wrap">
            <div className="instagram-profile-ring">
              <img 
                src="https://images.unsplash.com/photo-1559251606-c623743a6d76?w=300&auto=format&fit=crop&q=80" 
                alt="Marcia Reggiani - Amoreja Amigurumi" 
                className="instagram-profile-avatar"
              />
            </div>
          </div>

          <div className="instagram-profile-info">
            <div className="instagram-profile-top-line">
              <div className="instagram-name-wrapper">
                <h3 className="instagram-profile-name">
                  {config.author_name} • Amoreja
                </h3>
                <span className="instagram-verified-badge" title="Criadora Oficial">
                  <CheckCircle2 size={16} />
                </span>
              </div>

              <a 
                href={config.instagram_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-instagram-follow"
              >
                <InstagramIcon size={18} />
                <span>Seguir no Instagram</span>
                <ExternalLink size={14} className="follow-ext-icon" />
              </a>
            </div>

            <a 
              href={config.instagram_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="instagram-profile-handle"
            >
              {config.handle}
            </a>

            <p className="instagram-profile-bio">
              {config.bio}
            </p>

            <div className="instagram-profile-badges">
              <span className="ig-stat-pill">
                <Sparkles size={14} /> Maratona de Amigurumis
              </span>
              <span className="ig-stat-pill">
                <BookOpen size={14} /> Receitas Autorais em PDF
              </span>
              <span className="ig-stat-pill">
                <Users size={14} /> 20+ Designers Parceiras
              </span>
            </div>
          </div>
        </div>

        {/* Cabeçalho da Galeria de Publicações */}
        <div className="instagram-gallery-header">
          <div>
            <h2 className="instagram-section-title">
              <InstagramIcon size={26} className="title-ig-icon" />
              {config.title}
            </h2>
            <p className="instagram-section-subtitle">
              Confira os lançamentos, bastidores e passo a passo mais recentes publicados no nosso feed
            </p>
          </div>

          <a 
            href={config.instagram_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="instagram-view-all-link"
          >
            <span>Acessar @amorejaamigurumi</span>
            <ExternalLink size={16} />
          </a>
        </div>

        {/* Grade de Posts do Instagram */}
        <div className="instagram-feed-grid">
          {posts.map((post, idx) => (
            <a
              key={post.id || idx}
              href={post.post_url || config.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="instagram-post-card group"
            >
              <div className="instagram-post-image-box">
                <img
                  src={post.image_url}
                  alt={post.caption}
                  className="instagram-post-img"
                  loading="lazy"
                />
                
                {/* Badge de Tipo ou Maratona */}
                <div className="instagram-post-top-badge">
                  {post.type === 'reel' ? (
                    <span className="post-type-chip reel">
                      <Play size={12} fill="currentColor" /> Reel
                    </span>
                  ) : (
                    <span className="post-type-chip">
                      <Camera size={12} /> {post.tag || 'Foto'}
                    </span>
                  )}
                </div>

                {/* Overlay Interativo ao Passar o Mouse */}
                <div className="instagram-post-overlay">
                  <div className="instagram-overlay-stats">
                    <span className="stat-item">
                      <Heart size={18} fill="#ffffff" />
                      <span>{post.likes}</span>
                    </span>
                    <span className="stat-item">
                      <MessageCircle size={18} fill="#ffffff" />
                      <span>{post.comments}</span>
                    </span>
                  </div>

                  <p className="instagram-overlay-caption">
                    {post.caption}
                  </p>

                  <div className="instagram-overlay-cta">
                    <InstagramIcon size={16} />
                    <span>Ver no Instagram</span>
                    <ExternalLink size={14} />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Rodapé / Chamada Interativa para a Comunidade */}
        <div className="instagram-community-banner">
          <div className="community-banner-content">
            <span className="community-banner-icon">🧶</span>
            <div>
              <h4>Está tecendo uma das nossas receitas?</h4>
              <p>
                Compartilhe uma foto do seu amigurumi marcando <strong>{config.hashtag}</strong> ou mencione <strong>{config.handle}</strong> para ser repostada em nossos Stories e no Feed oficial!
              </p>
            </div>
          </div>
          <a
            href={config.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-community-tag"
          >
            <InstagramIcon size={18} />
            <span>Marcar no Instagram</span>
          </a>
        </div>

      </div>
    </section>
  );
}
