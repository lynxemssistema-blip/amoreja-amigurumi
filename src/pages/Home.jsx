import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import ProductCard from '../components/ProductCard';
import InstagramFeed from '../components/InstagramFeed';
import { 
  Award, 
  BookOpen, 
  Heart, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Star,
  ShieldCheck,
  Truck,
  Headphones,
  Gift,
  Smile,
  CheckCircle,
  CheckCircle2,
  Flame,
  Zap,
  Compass,
  Coffee,
  Clock,
  Gem,
  Package,
  FileText,
  Scissors,
  Layers,
  ShoppingBag,
  Eye,
  HelpCircle,
  Palette,
  Camera,
  MessageCircle,
  Download,
  ThumbsUp,
  Tag,
  Infinity as InfinityIcon,
  Shield,
  Crown,
  Lightbulb
} from 'lucide-react';
import './Home.css';

// Map de ícones para resolução dinâmica dos diferenciais
export const ICON_MAP = {
  BookOpen,
  Award,
  Users,
  Heart,
  Sparkles,
  Star,
  ShieldCheck,
  Truck,
  Headphones,
  Gift,
  Smile,
  CheckCircle,
  CheckCircle2,
  Flame,
  Zap,
  Compass,
  Coffee,
  Clock,
  Gem,
  Package,
  FileText,
  Scissors,
  Layers,
  ShoppingBag,
  Eye,
  HelpCircle,
  Palette,
  Camera,
  MessageCircle,
  Download,
  ThumbsUp,
  Tag,
  Infinity: InfinityIcon,
  Shield,
  Crown,
  Lightbulb
};

export const renderIconComponent = (iconName, size = 24) => {
  const IconComp = ICON_MAP[iconName] || Sparkles;
  return <IconComp size={size} />;
};

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
  button2_url: 'https://chat.whatsapp.com/DvGLoH4qisk2ir4copcYSm?s=hd&p=i&ilr=0',
  image_mode: 'fixed',
  selected_product_id: ''
};

export const DEFAULT_FEATURES = [
  {
    id: '1',
    icon: 'BookOpen',
    title: 'PDFs Passo a Passo',
    description: 'Receitas extremamente organizadas, com fotos de apoio para cada etapa importante.',
    visible: true
  },
  {
    id: '2',
    icon: 'Award',
    title: 'Qualidade Premium',
    description: 'Designs testados e validados por dezenas de artesãs antes de serem lançados.',
    visible: true
  },
  {
    id: '3',
    icon: 'Users',
    title: 'Suporte Exclusivo',
    description: 'Canal de suporte no WhatsApp para tirar qualquer dúvida que surgir durante os pontos.',
    visible: true
  }
];

export default function Home({ onAddToCart }) {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [hero, setHero] = useState(HERO_DEFAULTS);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const [features, setFeatures] = useState({ visible: true, items: DEFAULT_FEATURES });
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef(null);

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
        const { data: pData } = await supabase
          .from('new_amoreja_products')
          .select('*, new_amoreja_maratonas(title)')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        const products = pData && pData.length > 0 ? pData : MOCK_PRODUCTS;
        setAllProducts(products);

        // Filtra as receitas marcadas como destaque na Home (is_featured = true)
        const featured = products.filter(p => p.is_featured);
        setFeaturedProducts(featured.length > 0 ? featured : products);

        // Hero do site
        const { data: heroData } = await supabase
          .from('new_amoreja_site_content')
          .select('*')
          .eq('section_key', 'hero')
          .maybeSingle();

        if (heroData) {
          const extra = heroData.extra_data || {};
          setHero({
            subtitle: heroData.subtitle || HERO_DEFAULTS.subtitle,
            title: heroData.title || HERO_DEFAULTS.title,
            description: heroData.description || HERO_DEFAULTS.description,
            image_url: heroData.image_url || HERO_DEFAULTS.image_url,
            button_text: heroData.button_text || HERO_DEFAULTS.button_text,
            button_url: heroData.button_url || HERO_DEFAULTS.button_url,
            button2_text: heroData.button2_text || HERO_DEFAULTS.button2_text,
            button2_url: heroData.button2_url || HERO_DEFAULTS.button2_url,
            image_mode: extra.image_mode || 'fixed',
            selected_product_id: extra.selected_product_id || ''
          });
        }

        // Diferenciais / Features
        const { data: featData } = await supabase
          .from('new_amoreja_site_content')
          .select('*')
          .eq('section_key', 'features')
          .maybeSingle();

        if (featData) {
          const extra = featData.extra_data || {};
          setFeatures({
            visible: extra.visible !== false,
            items: Array.isArray(extra.items) && extra.items.length > 0 ? extra.items : DEFAULT_FEATURES
          });
        }

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

  // Auto-scroll para o carrossel de receitas do Hero
  useEffect(() => {
    if (hero.image_mode !== 'carousel') return;
    const images = allProducts.filter(p => p.image_url);
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentHeroSlide(prev => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [hero.image_mode, allProducts]);

  const isExternal = (url) => url && (url.startsWith('http') || url.startsWith('//'));

  const renderHeroImage = () => {
    if (hero.image_mode === 'carousel') {
      const images = allProducts.filter(p => p.image_url);
      if (images.length === 0) {
        return (
          <div className="hero-image-contained-wrapper">
            <div
              className="hero-image-bg-blur"
              style={{ backgroundImage: `url(${hero.image_url})` }}
            />
            <img src={hero.image_url} alt="Hero" className="hero-image-front" />
          </div>
        );
      }
      return (
        <div className="hero-image-carousel">
          {images.map((prod, idx) => (
            <div
              key={prod.id}
              className={`hero-carousel-slide ${idx === currentHeroSlide ? 'active' : ''}`}
              style={{
                position: idx === currentHeroSlide ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: idx === currentHeroSlide ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
                zIndex: idx === currentHeroSlide ? 2 : 1
              }}
            >
              <div
                className="hero-image-bg-blur"
                style={{ backgroundImage: `url(${prod.image_url})` }}
              />
              <img
                src={prod.image_url}
                alt={prod.title}
                className="hero-image-front"
              />
            </div>
          ))}
          {images.length > 1 && (
            <div className="hero-carousel-dots">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  className={`hero-carousel-dot ${idx === currentHeroSlide ? 'active' : ''}`}
                  onClick={() => setCurrentHeroSlide(idx)}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (hero.image_mode === 'recipe_fixed') {
      const selectedProd = allProducts.find(p => p.id === hero.selected_product_id);
      const imgSrc = selectedProd?.image_url || hero.image_url;
      return (
        <div className="hero-image-contained-wrapper">
          <div
            className="hero-image-bg-blur"
            style={{ backgroundImage: `url(${imgSrc})` }}
          />
          <img src={imgSrc} alt="Hero" className="hero-image-front" />
        </div>
      );
    }

    // Default: 'fixed'
    return (
      <div className="hero-image-contained-wrapper">
        <div
          className="hero-image-bg-blur"
          style={{ backgroundImage: `url(${hero.image_url})` }}
        />
        <img src={hero.image_url} alt="Hero" className="hero-image-front" />
      </div>
    );
  };

  const visibleFeatureItems = (features.items || []).filter(item => item.visible !== false);

  return (
    <div className="home-page">
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
            {renderHeroImage()}
            <div className="hero-image-badge" style={{ zIndex: 5 }}>
              <Heart size={20} className="badge-heart" />
              <span>100% Feito à Mão</span>
            </div>
          </div>
        </div>
      </section>

      {/* Destaques (Diferenciais / Features Editáveis pelo Admin) */}
      {features.visible !== false && visibleFeatureItems.length > 0 && (
        <section className="features-section">
          <div className="container features-grid" style={{ gridTemplateColumns: `repeat(${Math.min(visibleFeatureItems.length, 4)}, 1fr)` }}>
            {visibleFeatureItems.map((item) => (
              <div key={item.id} className="feature-item animate-fade-in">
                <div className="feature-icon-wrapper">
                  {renderIconComponent(item.icon, 24)}
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products — CARROSSEL / DESTAQUES */}
      <section className="featured-section section-padding">
        <div className="container">
          <h2 className="section-title">Destaques</h2>
          <p className="section-subtitle">Escolha seu próximo projeto e comece a tecer hoje mesmo!</p>
          
          {loading ? (
            <div className="loading-box">
              <div className="loader"></div>
            </div>
          ) : featuredProducts.length <= itemsPerView ? (
            <div className="featured-centered-grid">
              {featuredProducts.map((product) => (
                <div key={product.id} className="featured-card-wrapper">
                  <ProductCard product={product} onAddToCart={onAddToCart} />
                </div>
              ))}
            </div>
          ) : (
            <div className="carousel-wrapper">
              <button className="carousel-btn carousel-btn-left" onClick={() => scrollCarousel(-1)} disabled={carouselIndex === 0}>
                <ChevronLeft size={24} />
              </button>

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

              <button className="carousel-btn carousel-btn-right" onClick={() => scrollCarousel(1)} disabled={carouselIndex >= maxIndex}>
                <ChevronRight size={24} />
              </button>
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
