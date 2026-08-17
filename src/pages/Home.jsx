import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import ProductCard from '../components/ProductCard';
import InstagramFeed from '../components/InstagramFeed';
import { Award, BookOpen, Heart, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import './Home.css';

// Mockup de dados em caso de falha de conexão com Supabase
const MOCK_PRODUCTS = [
  {
    id: '1',
    title: 'Gigi Love - Girafinha com Óculos',
    description: 'Receita completa para criar a Gigi Love, a girafinha elegante com óculos escuros de coração. Inclui tutorial detalhado passo a passo.',
    price: 29.90,
    image_url: 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=600&auto=format&fit=crop&q=80',
    difficulty: 'Médio'
  },
  {
    id: '2',
    title: 'Rodolph - A Rena de Natal',
    description: 'Aprenda a crochetar o simpático Rodolph, perfeito para decorações de Natal e presentes especiais de final de ano.',
    price: 34.90,
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
    difficulty: 'Fácil'
  },
  {
    id: '3',
    title: 'Princesa Jasmine',
    description: 'Design inspirado na Princesa Jasmine, contendo todos os detalhes do cabelo, tiara e roupa clássica.',
    price: 39.90,
    image_url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop&q=80',
    difficulty: 'Avançado'
  }
];

const HERO_DEFAULTS = {
  subtitle: 'Mundo dos Amigurumis',
  title: 'Transformando fios em abraços quentinhos!',
  description: 'Crie amigurumis encantadores com receitas detalhadas, passo a passo ilustrado e suporte completo para você tecer amor em cada ponto.',
  image_url: 'https://images.unsplash.com/photo-1605007493699-af65834f8a00?w=800&auto=format&fit=crop&q=80',
  button_text: 'Ver Receitas em PDF',
  button_url: '/loja',
  button2_text: 'Entrar no Grupo',
  button2_url: 'https://chat.whatsapp.com/DvGLoH4qisk2ir4copcYSm?s=hd&p=i&ilr=0'
};

export default function Home({ onAddToCart }) {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [hero, setHero] = useState(HERO_DEFAULTS);
  const [maratonas, setMaratonas] = useState([]);
  const [bannerSettings, setBannerSettings] = useState({
    style: 'carousel', speed: 4,
    height: 420, gap: 0, paddingTop: 0, paddingBottom: 0, showBgBlur: true, bgOpacity: 0.55
  });
  const [bannerImages, setBannerImages] = useState([]);        // imagens de fundo (carrossel)
  const [featuredBannerImgs, setFeaturedBannerImgs] = useState([]); // imagens em destaque (coverflow)
  const [currentFeaturedIdx, setCurrentFeaturedIdx] = useState(0);  // índice ativo no coverflow
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    const fetchAll = async () => {
      if (!isSupabaseConfigured()) {
        setFeaturedProducts(MOCK_PRODUCTS);
        setAllProducts(MOCK_PRODUCTS);
        setLoading(false);
        return;
      }

      try {
        // Produtos
        const { data: pData } = await supabase.from('new_amoreja_products').select('*, new_amoreja_maratonas(title)');
        const products = pData && pData.length > 0 ? pData : MOCK_PRODUCTS;
        setAllProducts(products);
        setFeaturedProducts(products);

        // Hero do site
        const { data: heroData } = await supabase
          .from('new_amoreja_site_content')
          .select('*')
          .eq('section_key', 'hero')
          .maybeSingle();
        if (heroData) {
          setHero({
            subtitle: heroData.subtitle || HERO_DEFAULTS.subtitle,
            title: heroData.title || HERO_DEFAULTS.title,
            description: heroData.description || HERO_DEFAULTS.description,
            image_url: heroData.image_url || HERO_DEFAULTS.image_url,
            button_text: heroData.button_text || HERO_DEFAULTS.button_text,
            button_url: heroData.button_url || HERO_DEFAULTS.button_url,
            button2_text: heroData.button2_text || HERO_DEFAULTS.button2_text,
            button2_url: heroData.button2_url || HERO_DEFAULTS.button2_url
          });
        }

        // Banner Settings
        const { data: bannerData } = await supabase
          .from('new_amoreja_site_content')
          .select('*')
          .eq('section_key', 'banner_settings')
          .maybeSingle();
        if (bannerData) {
          let extras = {};
          try { extras = JSON.parse(bannerData.description || '{}'); } catch {}
          setBannerSettings({
            style: bannerData.title || 'carousel',
            speed: parseInt(bannerData.subtitle) || 4,
            height: extras.height ?? 420,
            gap: extras.gap ?? 0,
            paddingTop: extras.paddingTop ?? 0,
            paddingBottom: extras.paddingBottom ?? 0,
            showBgBlur: extras.showBgBlur !== false,
            bgOpacity: extras.bgOpacity ?? 0.55
          });
        }

        // Maratonas visíveis
        const { data: mData } = await supabase
          .from('new_amoreja_maratonas')
          .select('*')
          .eq('visible', true)
          .order('sort_order', { ascending: true });
        
        const loadedMaratonas = mData || [];
        setMaratonas(loadedMaratonas);

        // Data de hoje (sem hora) — usada para encontrar o destaque ativo
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ─────────────────────────────────────────────────────────────────────────
        // Lógica do Coverflow:
        //   - Coleta TODAS as imagens marcadas como destaque (is_featured),
        //     independentemente da data (passadas, ativas ou futuras).
        //   - Ordena por featured_from (data crescente).
        //   - Determina qual está ativa HOJE → essa fica no CENTRO.
        //   - A anterior na lista fica à ESQUERDA (prev).
        //   - A próxima na lista fica à DIREITA (next).
        //   - A posição é 100% guiada pela data — sem timer automático.
        // ─────────────────────────────────────────────────────────────────────────
        const allFeaturedImgs = [];
        const bgImages = [];

        loadedMaratonas.forEach(m => {
          if (!m.banner_images || !Array.isArray(m.banner_images)) return;

          m.banner_images.forEach((img, imgIdx) => {
            const imgObj = typeof img === 'string'
              ? { url: img, is_featured: false, featured_from: null, featured_until: null }
              : img;

            const slideData = {
              url: imgObj.url,
              title: m.title,
              tag: m.tag,
              cta_url: m.cta_url,
              cta_text: m.cta_text,
              maratona_image_url: m.image_url,
              isFirst: imgIdx === 0,
              _featured_from:  imgObj.featured_from  || null,
              _featured_until: imgObj.featured_until || null,
            };

            if (imgObj.is_featured) {
              // Adiciona ao coverflow (frente)
              allFeaturedImgs.push(slideData);
              // TAMBÉM adiciona ao fundo para não criar buracos no carrossel/marquee
              bgImages.push(slideData);
            } else {
              bgImages.push(slideData);
            }
          });
        });

        // 1. Ordena todas as imagens de destaque por data (crescente)
        allFeaturedImgs.sort((a, b) => {
          const da = a._featured_from ? new Date(a._featured_from) : new Date(0);
          const db = b._featured_from ? new Date(b._featured_from) : new Date(0);
          return da - db;
        });

        // 2. Encontra a imagem ativa HOJE (featured_from <= hoje <= featured_until)
        const todayMs = today.getTime();
        let centerIdx = allFeaturedImgs.findIndex(img => {
          const from  = img._featured_from  ? new Date(img._featured_from  + 'T00:00:00').getTime() : null;
          const until = img._featured_until ? new Date(img._featured_until + 'T23:59:59').getTime() : null;
          return (!from || todayMs >= from) && (!until || todayMs <= until);
        });

        // 3. Fallback: se nenhuma ativa hoje, usa a mais próxima no futuro;
        //    se todas passadas, usa a última.
        if (centerIdx === -1) {
          centerIdx = allFeaturedImgs.findIndex(img => {
            const from = img._featured_from ? new Date(img._featured_from + 'T00:00:00').getTime() : null;
            return from && from > todayMs;
          });
          if (centerIdx === -1) centerIdx = allFeaturedImgs.length - 1;
        }

        setFeaturedBannerImgs(allFeaturedImgs);
        setCurrentFeaturedIdx(Math.max(0, centerIdx));

        // 4. Imagens de fundo: ordena por data
        bgImages.sort((a, b) => {
          const dateA = a._featured_from ? new Date(a._featured_from) : null;
          const dateB = b._featured_from ? new Date(b._featured_from) : null;
          if (dateA && dateB) return dateA - dateB;
          if (dateA) return -1;
          if (dateB) return 1;
          return 0;
        });

        setBannerImages(bgImages);

      } catch (err) {
        console.error("Erro ao carregar Home:", err.message);
        setFeaturedProducts(MOCK_PRODUCTS);
        setAllProducts(MOCK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Carrossel controls
  const getItemsPerView = () => {
    if (windowWidth < 600) return 1;
    if (windowWidth < 900) return 2;
    if (windowWidth < 1200) return 3;
    return 4;
  };
  const itemsPerView = getItemsPerView();
  const maxIndex = Math.max(0, featuredProducts.length - itemsPerView);

  const scrollCarousel = (dir) => {
    setCarouselIndex(prev => {
      const next = prev + dir;
      return Math.max(0, Math.min(next, maxIndex));
    });
  };

  // Auto-scroll a cada 5s para produtos
  useEffect(() => {
    if (featuredProducts.length <= itemsPerView) return;
    const timer = setInterval(() => {
      setCarouselIndex(prev => prev >= maxIndex ? 0 : prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredProducts, maxIndex, itemsPerView]);

  // Auto-scroll para o Banner de Maratonas
  const scrollToBannerSlide = (idx) => {
    setCurrentBannerIndex(idx);
  };

  useEffect(() => {
    if (bannerSettings.style !== 'carousel' || bannerImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % bannerImages.length);
    }, (bannerSettings.speed || 5) * 1000);
    return () => clearInterval(interval);
  }, [bannerSettings.style, bannerSettings.speed, bannerImages.length]);

  // O coverflow NÃO usa timer — a posição central é determinada pela data ativa.
  // O usuário pode clicar nas laterais para navegar manualmente (prévia).

  const isExternal = (url) => url && (url.startsWith('http') || url.startsWith('//'));

  // Mostra o banner se tiver imagens de fundo OU destaques
  const hasBanner = bannerImages.length > 0 || featuredBannerImgs.length > 0;

  return (
    <div className="home-page">
      {/* Banner de Maratonas */}
      {hasBanner && (
        <section
          className={`top-banner-section ${bannerSettings.style}`}
          style={{ height: `${bannerSettings.height}px` }}
        >

          {/* ── Fundo da seção: imagem oficial desfocada (se ativo) ── */}
          {bannerSettings.showBgBlur && bannerImages[0]?.maratona_image_url && (
            <div
              style={{
                position: 'absolute', inset: 0, zIndex: 0,
                backgroundImage: `url(${bannerImages[0].maratona_image_url})`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                filter: 'blur(18px) brightness(0.4)',
                transform: 'scale(1.08)'
              }}
            />
          )}

          {/* ── Fundo: Carrossel ou Marquee ── */}
          {bannerSettings.style === 'carousel' ? (
            <div className="banner-carousel">
              <div
                className="banner-track"
                style={{
                  width: `${Math.max(bannerImages.length, 1) * 100}%`,
                  transform: `translateX(-${currentBannerIndex * (100 / Math.max(bannerImages.length, 1))}%)`
                  /* Sem gap no track — usamos padding nos slides para não quebrar o translateX */
                }}
              >
                {bannerImages.map((slide, idx) => (
                  <div
                    key={idx}
                    className="banner-slide"
                    style={{
                      width: `${100 / Math.max(bannerImages.length, 1)}%`,
                      paddingTop: `${bannerSettings.paddingTop}px`,
                      paddingBottom: `${bannerSettings.paddingBottom}px`,
                      /* Gap como padding horizontal — espaçamento visual entre imagens */
                      paddingLeft: `${bannerSettings.gap / 2}px`,
                      paddingRight: `${bannerSettings.gap / 2}px`
                    }}
                  >
                    {bannerSettings.showBgBlur && slide.maratona_image_url && (
                      <div className="banner-slide-bg" style={{ backgroundImage: `url(${slide.maratona_image_url})` }} />
                    )}
                    <img
                      src={slide.url}
                      alt={`Banner ${idx}`}
                      className="banner-slide-img"
                      style={{ opacity: bannerSettings.bgOpacity }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="banner-marquee" style={{ '--speed': `${bannerSettings.speed}s` }}>
              <div className="marquee-content" style={{ gap: `${bannerSettings.gap}px` }}>
                {[...bannerImages, ...bannerImages].map((slide, idx) => (
                  <div
                    key={idx}
                    className="marquee-slide"
                    style={{
                      paddingTop: `${bannerSettings.paddingTop}px`,
                      paddingBottom: `${bannerSettings.paddingBottom}px`
                    }}
                  >
                    <img
                      src={slide.url}
                      alt="Banner Maratona"
                      style={{ opacity: bannerSettings.bgOpacity, width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Coverflow de Destaques — posição guiada pela data ── */}
          {featuredBannerImgs.length > 0 ? (
            <div className="banner-coverflow">
              {/* Renderiza exatamente 3 slots: prev, center, next */}
              {[
                { slot: 'prev',   img: featuredBannerImgs[currentFeaturedIdx - 1], idx: currentFeaturedIdx - 1 },
                { slot: 'center', img: featuredBannerImgs[currentFeaturedIdx],     idx: currentFeaturedIdx     },
                { slot: 'next',   img: featuredBannerImgs[currentFeaturedIdx + 1], idx: currentFeaturedIdx + 1 },
              ].map(({ slot, img, idx }) => {
                if (!img) return null; // sem imagem anterior ou próxima → slot vazio

                return (
                  <div
                    key={slot}
                    className={`coverflow-item ${slot}`}
                    onClick={() => {
                      if (slot === 'center' && img.cta_url) window.open(img.cta_url, '_blank');
                      else if (slot !== 'center') setCurrentFeaturedIdx(idx);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <img src={img.url} alt={`Destaque ${slot}`} className="coverflow-img" />
                  </div>
                );
              })}

              {/* Indicadores */}
              {featuredBannerImgs.length > 1 && (
                <div className="coverflow-dots">
                  {featuredBannerImgs.map((_, idx) => (
                    <button
                      key={idx}
                      className={`banner-dot ${idx === currentFeaturedIdx ? 'active' : ''}`}
                      onClick={() => setCurrentFeaturedIdx(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Sem destaque: overlay com título na imagem atual do carrossel */
            bannerSettings.style === 'carousel' && bannerImages.length > 0 && (
              <div className="banner-slide-overlay" style={{ pointerEvents: 'none' }}>
                <div className="banner-overlay-content">
                  <span className="banner-tag">{bannerImages[currentBannerIndex]?.tag}</span>
                  <h2 className="banner-title">{bannerImages[currentBannerIndex]?.title}</h2>
                  {bannerImages[currentBannerIndex]?.cta_url && (
                    <span
                      className="btn btn-banner"
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onClick={() => window.open(bannerImages[currentBannerIndex].cta_url, '_blank')}
                    >
                      {bannerImages[currentBannerIndex].cta_text || 'Saiba Mais'}
                    </span>
                  )}
                </div>
              </div>
            )
          )}

          {/* Dots do carrossel de fundo — só sem destaques */}
          {bannerSettings.style === 'carousel' && featuredBannerImgs.length === 0 && bannerImages.length > 1 && (
            <div className="banner-dots">
              {bannerImages.map((_, idx) => (
                <button
                  key={idx}
                  className={`banner-dot ${idx === currentBannerIndex ? 'active' : ''}`}
                  onClick={() => scrollToBannerSlide(idx)}
                />
              ))}
            </div>
          )}

        </section>
      )}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content animate-fade-in">
            <span className="hero-subtitle">{hero.subtitle}</span>
            <h1 className="hero-title">{hero.title}</h1>
            <p className="hero-description">{hero.description}</p>
            <div className="hero-buttons">
              {isExternal(hero.button_url) ? (
                <a href={hero.button_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">{hero.button_text}</a>
              ) : (
                <Link to={hero.button_url || '/loja'} className="btn btn-primary">{hero.button_text}</Link>
              )}
              {isExternal(hero.button2_url) ? (
                <a href={hero.button2_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline">{hero.button2_text}</a>
              ) : (
                <Link to={hero.button2_url || '#'} className="btn btn-outline">{hero.button2_text}</Link>
              )}
            </div>
          </div>
          <div className="hero-image-wrapper animate-fade-in">
            <img src={hero.image_url} alt="Hero" className="hero-image" />
            <div className="hero-image-badge">
              <Heart size={20} className="badge-heart" />
              <span>100% Feito à Mão</span>
            </div>
          </div>
        </div>
      </section>

      {/* Maratonas (dinâmicas do Supabase) */}
      {maratonas.length > 0 && (
        <section className="festival-banner-section">
          <div className="container">
            {maratonas.map(m => (
              <div key={m.id} className="festival-card" style={{ marginBottom: maratonas.length > 1 ? '20px' : 0 }}>
                <div className="festival-info">
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <span className="festival-tag" style={{ marginBottom: 0 }}>{m.tag}</span>
                    {m.status === 'finalizada' && (
                      <span className="festival-tag" style={{ marginBottom: 0, background: '#6c757d', color: 'white', border: 'none' }}>Finalizada</span>
                    )}
                    {m.status === 'andamento' && (
                      <span className="festival-tag" style={{ marginBottom: 0, background: '#28a745', color: 'white', border: 'none' }}>Em Andamento</span>
                    )}
                  </div>
                  <h2 className="festival-title" style={{ marginTop: 0 }}>{m.title}</h2>
                  <p className="festival-desc">{m.description}</p>
                  <div className="festival-cta-box">
                    <a href={m.cta_url} target="_blank" rel="noreferrer" className="btn btn-secondary">
                      {m.cta_text}
                    </a>
                  </div>
                </div>
                {m.image_url && (
                  <div className="festival-visual">
                    <img src={m.image_url} alt={m.title} className="festival-img" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Destaques (Stats/Diferenciais) */}
      <section className="features-section">
        <div className="container features-grid">
          <div className="feature-item">
            <div className="feature-icon-wrapper">
              <BookOpen size={24} />
            </div>
            <h3>PDFs Passo a Passo</h3>
            <p>Receitas extremamente organizadas, com fotos de apoio para cada etapa importante.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon-wrapper">
              <Award size={24} />
            </div>
            <h3>Qualidade Premium</h3>
            <p>Designs testados e validados por dezenas de artesãs antes de serem lançados.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon-wrapper">
              <Users size={24} />
            </div>
            <h3>Suporte Exclusivo</h3>
            <p>Canal de suporte no WhatsApp para tirar qualquer dúvida que surgir durante os pontos.</p>
          </div>
        </div>
      </section>

      {/* Featured Products — CARROSSEL */}
      <section className="featured-section section-padding">
        <div className="container">
          <h2 className="section-title">Receitas em Destaque</h2>
          <p className="section-subtitle">Escolha seu próximo projeto e comece a tecer hoje mesmo!</p>
          
          {loading ? (
            <div className="loading-box">
              <div className="loader"></div>
            </div>
          ) : (
            <div className="carousel-wrapper">
              {featuredProducts.length > itemsPerView && (
                <button className="carousel-btn carousel-btn-left" onClick={() => scrollCarousel(-1)} disabled={carouselIndex === 0}>
                  <ChevronLeft size={24} />
                </button>
              )}

              <div className="carousel-viewport" ref={carouselRef}>
                <div className="carousel-track"
                  style={{ transform: `translateX(-${carouselIndex * (100 / itemsPerView)}%)` }}>
                  {featuredProducts.map((product) => (
                    <div key={product.id} className="carousel-item" style={{
                      flex: `0 0 ${100 / itemsPerView}%`,
                      width: `${100 / itemsPerView}%`,
                      maxWidth: `${100 / itemsPerView}%`
                    }}>
                      <ProductCard product={product} onAddToCart={onAddToCart} />
                    </div>
                  ))}
                </div>
              </div>

              {featuredProducts.length > itemsPerView && (
                <button className="carousel-btn carousel-btn-right" onClick={() => scrollCarousel(1)} disabled={carouselIndex >= maxIndex}>
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
          )}

          {/* Dots */}
          {featuredProducts.length > itemsPerView && (
            <div className="carousel-dots">
              {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                <button key={i} className={`carousel-dot ${i === carouselIndex ? 'active' : ''}`}
                  onClick={() => setCarouselIndex(i)} />
              ))}
            </div>
          )}
          
          <div className="view-more-box">
            <Link to="/loja" className="btn btn-outline">
              Ver Catálogo Completo
            </Link>
          </div>
        </div>
      </section>

      {/* Instagram Feed Integration */}
      <InstagramFeed />
    </div>
  );
}
