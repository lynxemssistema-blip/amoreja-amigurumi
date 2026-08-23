import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import ProductCard from '../components/ProductCard';
import { 
  Sparkles, 
  Calendar, 
  Users, 
  BookOpen, 
  Award, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Flame, 
  ChevronRight,
  ShoppingBag
} from 'lucide-react';
import './Maratonas.css';

export default function Maratonas({ onAddToCart }) {
  const [maratonas, setMaratonas] = useState([]);
  const [products, setProducts] = useState([]);
  const [bannerSettings, setBannerSettings] = useState({
    style: 'carousel',
    speed: 4,
    height: 420,
    gap: 0,
    paddingTop: 0,
    paddingBottom: 0,
    showBgBlur: true,
    bgOpacity: 0.55
  });
  const [bannerImages, setBannerImages] = useState([]);
  const [featuredBannerImgs, setFeaturedBannerImgs] = useState([]);
  const [currentFeaturedIdx, setCurrentFeaturedIdx] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadData();
  }, []);

  const loadData = async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Carregar Configurações de Banner
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

      // 2. Carregar Maratonas
      const { data: mData } = await supabase
        .from('new_amoreja_maratonas')
        .select('*')
        .eq('visible', true)
        .order('sort_order', { ascending: true });

      const loadedMaratonas = mData || [];
      setMaratonas(loadedMaratonas);

      // 3. Carregar Produtos com maratona_id
      const { data: pData } = await supabase
        .from('new_amoreja_products')
        .select('*, new_amoreja_maratonas(title)');

      setProducts(pData || []);

      // 4. Processar Banners de Maratonas (Coverflow & Fundo)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMs = today.getTime();

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
            maratona_id: m.id,
            isFirst: imgIdx === 0,
            _featured_from: imgObj.featured_from || null,
            _featured_until: imgObj.featured_until || null,
          };

          if (imgObj.is_featured) {
            allFeaturedImgs.push(slideData);
            bgImages.push(slideData);
          } else {
            bgImages.push(slideData);
          }
        });
      });

      // Ordena imagens de destaque por data crescente
      allFeaturedImgs.sort((a, b) => {
        const da = a._featured_from ? new Date(a._featured_from) : new Date(0);
        const db = b._featured_from ? new Date(b._featured_from) : new Date(0);
        return da - db;
      });

      // Encontra a imagem ativa hoje
      let centerIdx = allFeaturedImgs.findIndex(img => {
        const from = img._featured_from ? new Date(img._featured_from + 'T00:00:00').getTime() : null;
        const until = img._featured_until ? new Date(img._featured_until + 'T23:59:59').getTime() : null;
        return (!from || todayMs >= from) && (!until || todayMs <= until);
      });

      if (centerIdx === -1) {
        centerIdx = allFeaturedImgs.findIndex(img => {
          const from = img._featured_from ? new Date(img._featured_from + 'T00:00:00').getTime() : null;
          return from && from > todayMs;
        });
        if (centerIdx === -1) centerIdx = allFeaturedImgs.length - 1;
      }

      setFeaturedBannerImgs(allFeaturedImgs);
      setCurrentFeaturedIdx(Math.max(0, centerIdx));

      bgImages.sort((a, b) => {
        const dateA = a._featured_from ? new Date(a._featured_from) : null;
        const dateB = b._featured_from ? new Date(b._featured_from) : null;
        if (dateA && dateB) return dateA - dateB;
        if (dateA) return -1;
        if (dateB) return 1;
        return 0;
      });

      setBannerImages(bgImages);

    } catch (e) {
      console.error("Erro ao carregar dados da página Maratonas:", e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll para o Banner de fundo no modo carrossel
  useEffect(() => {
    if (bannerSettings.style !== 'carousel' || bannerImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % bannerImages.length);
    }, (bannerSettings.speed || 5) * 1000);
    return () => clearInterval(interval);
  }, [bannerSettings.style, bannerSettings.speed, bannerImages.length]);

  const hasBanner = bannerImages.length > 0 || featuredBannerImgs.length > 0;

  const formatUrl = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  };

  // Filtragem de maratonas
  const filteredMaratonas = maratonas.filter(m => {
    if (selectedFilter === 'todos') return true;
    if (selectedFilter === 'andamento') return m.status === 'andamento';
    if (selectedFilter === 'finalizada') return m.status === 'finalizada';
    return true;
  });

  return (
    <div className="maratonas-page">
      {/* ═══════════════════ TOP BANNER (CAROUSEL / MARQUEE / COVERFLOW) ═══════════════════ */}
      {hasBanner && (
        <section
          className={`top-banner-section ${bannerSettings.style}`}
          style={{ height: `${bannerSettings.height}px` }}
        >
          {/* Fundo desfocado se configurado */}
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

          {/* Fundo Carrossel ou Marquee */}
          {bannerSettings.style === 'carousel' ? (
            <div className="banner-carousel">
              <div
                className="banner-track"
                style={{
                  width: `${Math.max(bannerImages.length, 1) * 100}%`,
                  transform: `translateX(-${currentBannerIndex * (100 / Math.max(bannerImages.length, 1))}%)`
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
                      style={{ opacity: bannerSettings.bgOpacity, width: 'auto', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coverflow de Destaques guiado por data */}
          {featuredBannerImgs.length > 0 ? (
            <div className="banner-coverflow">
              {[
                { slot: 'prev', img: featuredBannerImgs[currentFeaturedIdx - 1], idx: currentFeaturedIdx - 1 },
                { slot: 'center', img: featuredBannerImgs[currentFeaturedIdx], idx: currentFeaturedIdx },
                { slot: 'next', img: featuredBannerImgs[currentFeaturedIdx + 1], idx: currentFeaturedIdx + 1 },
              ].map(({ slot, img, idx }) => {
                if (!img) return null;

                return (
                  <div
                    key={slot}
                    className={`coverflow-item ${slot}`}
                    onClick={() => {
                      if (slot === 'center' && img.cta_url) window.open(formatUrl(img.cta_url), '_blank');
                      else if (slot !== 'center') setCurrentFeaturedIdx(idx);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <img src={img.url} alt={`Destaque ${slot}`} className="coverflow-img" />
                  </div>
                );
              })}

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
            bannerSettings.style === 'carousel' && bannerImages.length > 0 && (
              <div className="banner-slide-overlay" style={{ pointerEvents: 'none' }}>
                <div className="banner-overlay-content">
                  <span className="banner-tag">{bannerImages[currentBannerIndex]?.tag}</span>
                  <h2 className="banner-title">{bannerImages[currentBannerIndex]?.title}</h2>
                  {bannerImages[currentBannerIndex]?.cta_url && (
                    <span
                      className="btn btn-banner"
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onClick={() => window.open(formatUrl(bannerImages[currentBannerIndex].cta_url), '_blank')}
                    >
                      {bannerImages[currentBannerIndex].cta_text || 'Saiba Mais'}
                    </span>
                  )}
                </div>
              </div>
            )
          )}

          {bannerSettings.style === 'carousel' && featuredBannerImgs.length === 0 && bannerImages.length > 1 && (
            <div className="banner-dots">
              {bannerImages.map((_, idx) => (
                <button
                  key={idx}
                  className={`banner-dot ${idx === currentBannerIndex ? 'active' : ''}`}
                  onClick={() => setCurrentBannerIndex(idx)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════ PAGE HEADER ═══════════════════ */}
      <section className="maratonas-header-section">
        <div className="container">
          <div className="maratonas-header-content">
            <span className="maratonas-badge-pill">
              <Sparkles size={14} /> Eventos & Desafios Exclusivos
            </span>
            <h1 className="maratonas-main-title">Maratonas de Amigurumi</h1>
            <p className="maratonas-main-desc">
              Participe de encontros especiais, teça peças incríveis em comunidade, aprenda técnicas avançadas com passo a passo e receba suporte direto durante todo o projeto.
            </p>

            {/* Filtros de Status */}
            {maratonas.length > 0 && (
              <div className="maratonas-filters">
                <button
                  className={`filter-btn ${selectedFilter === 'todos' ? 'active' : ''}`}
                  onClick={() => setSelectedFilter('todos')}
                >
                  Todas as Maratonas ({maratonas.length})
                </button>
                <button
                  className={`filter-btn ${selectedFilter === 'andamento' ? 'active' : ''}`}
                  onClick={() => setSelectedFilter('andamento')}
                >
                  🟢 Em Andamento ({maratonas.filter(m => m.status === 'andamento').length})
                </button>
                <button
                  className={`filter-btn ${selectedFilter === 'finalizada' ? 'active' : ''}`}
                  onClick={() => setSelectedFilter('finalizada')}
                >
                  ⚪ Finalizadas ({maratonas.filter(m => m.status === 'finalizada').length})
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════ LISTAGEM DE MARATONAS ═══════════════════ */}
      <section className="maratonas-list-section">
        <div className="container">
          {loading ? (
            <div className="maratonas-loading">
              <div className="loader"></div>
              <p>Carregando maratonas...</p>
            </div>
          ) : filteredMaratonas.length === 0 ? (
            <div className="maratonas-empty-state">
              <span className="empty-emoji">🧶</span>
              <h3>Nenhuma maratona encontrada</h3>
              <p>Fique atenta às nossas redes para os próximos lançamentos e eventos!</p>
            </div>
          ) : (
            <div className="maratonas-cards-stack">
              {filteredMaratonas.map((maratona) => {
                // Produtos pertencentes a esta maratona
                const relatedProducts = products.filter(p => p.maratona_id === maratona.id);

                return (
                  <div key={maratona.id} className="maratona-full-card animate-fade-in">
                    <div className="maratona-card-main">
                      <div className="maratona-card-info">
                        <div className="maratona-card-header">
                          <span className="maratona-tag">{maratona.tag || 'Edição Especial'}</span>
                          {maratona.status === 'andamento' ? (
                            <span className="status-badge live">
                              <Flame size={13} /> Em Andamento
                            </span>
                          ) : (
                            <span className="status-badge ended">
                              <CheckCircle2 size={13} /> Finalizada
                            </span>
                          )}
                        </div>

                        <h2 className="maratona-card-title">{maratona.title}</h2>
                        <p className="maratona-card-desc">{maratona.description}</p>

                        <div className="maratona-highlights">
                          <div className="highlight-pill">
                            <BookOpen size={15} /> Passo a Passo Ilustrado
                          </div>
                          <div className="highlight-pill">
                            <Users size={15} /> Grupo VIP de Alunas
                          </div>
                          <div className="highlight-pill">
                            <Award size={15} /> Acesso Vitalício
                          </div>
                        </div>

                        {maratona.cta_url && (
                          <div className="maratona-cta-row">
                            <a
                              href={formatUrl(maratona.cta_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-maratona-action"
                            >
                              {maratona.cta_text || 'Saber Como Participar'}
                              <ExternalLink size={16} />
                            </a>
                          </div>
                        )}
                      </div>

                      {maratona.image_url && (
                        <div className="maratona-card-visual">
                          <img
                            src={maratona.image_url}
                            alt={maratona.title}
                            className="maratona-official-img"
                          />
                        </div>
                      )}
                    </div>

                    {/* Receitas vinculadas a esta maratona */}
                    {relatedProducts.length > 0 && (
                      <div className="maratona-related-recipes">
                        <div className="related-header">
                          <div className="related-title-box">
                            <ShoppingBag size={18} className="related-icon" />
                            <h3>Receitas Digitais Desta Maratona</h3>
                          </div>
                          <span className="related-count">{relatedProducts.length} receita(s) disponível(is)</span>
                        </div>

                        <div className="related-grid">
                          {relatedProducts.map(prod => (
                            <div key={prod.id} className="related-item">
                              <ProductCard product={prod} onAddToCart={onAddToCart} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════ COMO FUNCIONAM AS MARATONAS ═══════════════════ */}
      <section className="maratonas-how-it-works">
        <div className="container">
          <div className="how-it-works-header">
            <span className="section-subtitle">Tire suas dúvidas</span>
            <h2 className="section-title">Como Funcionam Nossas Maratonas?</h2>
            <p className="section-desc">
              Uma experiência completa para quem ama crochetar e deseja evoluir suas peças com apoio de uma comunidade acolhedora.
            </p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon-circle">
                <BookOpen size={24} />
              </div>
              <h3>Receitas Detalhadas</h3>
              <p>Você recebe o material em PDF com gráficos limpos, contagem exata de pontos e fotografias em alta definição de cada etapa.</p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon-circle">
                <Users size={24} />
              </div>
              <h3>Comunidade & Grupo VIP</h3>
              <p>Acesso exclusivo ao grupo do WhatsApp para trocar ideias, tirar dúvidas diretamente com a criadora e compartilhar seus avanços.</p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon-circle">
                <Clock size={24} />
              </div>
              <h3>No Seu Ritmo</h3>
              <p>Apesar de ser um evento com cronograma e dicas diárias, os PDFs são seus para sempre, para tecer quando e quantas vezes quiser.</p>
            </div>

            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-icon-circle">
                <Award size={24} />
              </div>
              <h3>Suporte Dedicado</h3>
              <p>Qualquer dúvida que surgir na execução dos pontos, montagem ou acabamentos, nossa equipe está pronta para te auxiliar.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
