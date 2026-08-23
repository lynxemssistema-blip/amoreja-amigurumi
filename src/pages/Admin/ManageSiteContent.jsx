import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  GripVertical, 
  Image as ImageIcon, 
  RefreshCw, 
  X, 
  ChevronUp, 
  ChevronDown,
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
  HelpCircle, 
  Palette, 
  Camera, 
  MessageCircle, 
  Download, 
  ThumbsUp, 
  Tag, 
  Shield, 
  Crown, 
  Lightbulb,
  Check,
  ExternalLink
} from 'lucide-react';
import './ManageSiteContent.css';

// Catálogo de ícones disponíveis para os diferenciais
const AVAILABLE_ICONS = [
  { name: 'BookOpen', label: 'Livro / PDF', Icon: BookOpen },
  { name: 'Award', label: 'Medalha / Qualidade', Icon: Award },
  { name: 'Users', label: 'Grupo / Comunidade', Icon: Users },
  { name: 'Heart', label: 'Coração / Feito à Mão', Icon: Heart },
  { name: 'Sparkles', label: 'Brilho / Especial', Icon: Sparkles },
  { name: 'Star', label: 'Estrela / Destaque', Icon: Star },
  { name: 'ShieldCheck', label: 'Garantia / Seguro', Icon: ShieldCheck },
  { name: 'Truck', label: 'Entrega / Envio', Icon: Truck },
  { name: 'Headphones', label: 'Suporte / Atendimento', Icon: Headphones },
  { name: 'Gift', label: 'Presente / Bônus', Icon: Gift },
  { name: 'Smile', label: 'Sorriso / Satisfação', Icon: Smile },
  { name: 'CheckCircle2', label: 'Check / Aprovado', Icon: CheckCircle2 },
  { name: 'Flame', label: 'Fogo / Em Alta', Icon: Flame },
  { name: 'Zap', label: 'Raio / Rápido', Icon: Zap },
  { name: 'Compass', label: 'Bússola / Guia', Icon: Compass },
  { name: 'Coffee', label: 'Café / Aconchego', Icon: Coffee },
  { name: 'Clock', label: 'Relógio / Tempo', Icon: Clock },
  { name: 'Gem', label: 'Diamante / Premium', Icon: Gem },
  { name: 'Package', label: 'Pacote / Entrega', Icon: Package },
  { name: 'FileText', label: 'Documento / Arquivo', Icon: FileText },
  { name: 'Scissors', label: 'Tesoura / Artesanato', Icon: Scissors },
  { name: 'Layers', label: 'Camadas / Estrutura', Icon: Layers },
  { name: 'ShoppingBag', label: 'Sacola / Compras', Icon: ShoppingBag },
  { name: 'HelpCircle', label: 'Ajuda / Dúvida', Icon: HelpCircle },
  { name: 'Palette', label: 'Paleta / Cores', Icon: Palette },
  { name: 'Camera', label: 'Câmera / Fotos', Icon: Camera },
  { name: 'MessageCircle', label: 'Mensagem / Chat', Icon: MessageCircle },
  { name: 'Download', label: 'Download / Baixar', Icon: Download },
  { name: 'ThumbsUp', label: 'Joinha / Aprovado', Icon: ThumbsUp },
  { name: 'Tag', label: 'Etiqueta / Desconto', Icon: Tag },
  { name: 'Crown', label: 'Coroa / Exclusivo', Icon: Crown },
  { name: 'Lightbulb', label: 'Ideia / Criatividade', Icon: Lightbulb }
];

const DEFAULT_FEATURES_ITEMS = [
  { id: '1', icon: 'BookOpen', title: 'PDFs Passo a Passo', description: 'Receitas extremamente organizadas, com fotos de apoio para cada etapa importante.', visible: true },
  { id: '2', icon: 'Award', title: 'Qualidade Premium', description: 'Designs testados e validados por dezenas de artesãs antes de serem lançados.', visible: true },
  { id: '3', icon: 'Users', title: 'Suporte Exclusivo', description: 'Canal de suporte no WhatsApp para tirar qualquer dúvida que surgir durante os pontos.', visible: true }
];

export default function ManageSiteContent() {
  // Aba ativa: 'site' (conteúdo geral/home) ou 'maratonas' (página de maratonas)
  const [activeTab, setActiveTab] = useState('site');

  // ── Hero state ──
  const [hero, setHero] = useState({
    subtitle: 'Mundo dos Amigurumis',
    title: 'Transformando fios em abraços quentinhos!',
    description: 'Crie amigurumis encantadores com receitas detalhadas, passo a passo ilustrado e suporte completo para você tecer amor em cada ponto.',
    image_url: '',
    button_text: 'Ver Receitas em PDF',
    button_url: '/loja',
    button2_text: 'Entrar no Grupo',
    button2_url: '',
    image_mode: 'fixed',
    selected_product_id: ''
  });
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroSaved, setHeroSaved] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [products, setProducts] = useState([]);

  // ── Logo state ──
  const [logo, setLogo] = useState({ url: '' });
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // ── Diferenciais / Features state ──
  const [features, setFeatures] = useState({
    visible: true,
    items: DEFAULT_FEATURES_ITEMS
  });
  const [featuresSaving, setFeaturesSaving] = useState(false);
  const [featuresSaved, setFeaturesSaved] = useState(false);
  const [activeIconPickerId, setActiveIconPickerId] = useState(null);

  // ── Instagram Feed (Home) state ──
  const [instagramFeed, setInstagramFeed] = useState({
    visible: true,
    title: 'Nosso Feed do Instagram',
    subtitle: 'Siga-nos @amorejaamigurumi e acompanhe as novidades!',
    handle: '@amorejaamigurumi',
    instagram_url: 'https://www.instagram.com/amorejaamigurumi/'
  });
  const [instagramSaving, setInstagramSaving] = useState(false);
  const [instagramSaved, setInstagramSaved] = useState(false);

  // ── Banner Settings (Maratonas) ──
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
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);

  // ── Maratonas state ──
  const [maratonas, setMaratonas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    title: '', tag: 'Edição Especial', description: '', image_url: '',
    cta_text: 'Saber Como Participar', cta_url: '', visible: true, status: 'andamento', banner_images: []
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formUploading, setFormUploading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    setLoading(true);
    try {
      // Receitas para o dropdown
      const { data: productsData } = await supabase
        .from('new_amoreja_products')
        .select('id, title, image_url')
        .order('title', { ascending: true });
      setProducts(productsData || []);

      // Hero
      const { data: heroData } = await supabase
        .from('new_amoreja_site_content')
        .select('*')
        .eq('section_key', 'hero')
        .maybeSingle();
      if (heroData) {
        const extra = heroData.extra_data || {};
        setHero({
          subtitle: heroData.subtitle || '',
          title: heroData.title || '',
          description: heroData.description || '',
          image_url: heroData.image_url || '',
          button_text: heroData.button_text || '',
          button_url: heroData.button_url || '',
          button2_text: heroData.button2_text || '',
          button2_url: heroData.button2_url || '',
          image_mode: extra.image_mode || 'fixed',
          selected_product_id: extra.selected_product_id || ''
        });
      }

      // Logo
      const { data: logoData } = await supabase
        .from('new_amoreja_site_content')
        .select('*')
        .eq('section_key', 'logo')
        .maybeSingle();
      if (logoData) {
        setLogo({
          url: logoData.image_url || ''
        });
      }

      // Diferenciais / Features
      const { data: featData } = await supabase
        .from('new_amoreja_site_content')
        .select('*')
        .eq('section_key', 'features')
        .maybeSingle();
      if (featData && featData.extra_data) {
        setFeatures({
          visible: featData.extra_data.visible !== false,
          items: Array.isArray(featData.extra_data.items) && featData.extra_data.items.length > 0 
            ? featData.extra_data.items 
            : DEFAULT_FEATURES_ITEMS
        });
      }

      // Instagram Feed
      const { data: instaData } = await supabase
        .from('new_amoreja_site_content')
        .select('*')
        .eq('section_key', 'instagram_feed')
        .maybeSingle();
      if (instaData) {
        const extra = instaData.extra_data || {};
        setInstagramFeed({
          visible: extra.visible !== false,
          title: instaData.title || 'Nosso Feed do Instagram',
          subtitle: instaData.subtitle || 'Siga-nos @amorejaamigurumi e acompanhe as novidades!',
          handle: extra.handle || '@amorejaamigurumi',
          instagram_url: extra.instagram_url || 'https://www.instagram.com/amorejaamigurumi/'
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

      // Maratonas
      const { data: mData } = await supabase
        .from('new_amoreja_maratonas')
        .select('*')
        .order('sort_order', { ascending: true });
      setMaratonas(mData || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Hero Save ──
  const saveHero = async () => {
    setHeroSaving(true);
    try {
      await supabase.from('new_amoreja_site_content').upsert({
        section_key: 'hero',
        subtitle: hero.subtitle,
        title: hero.title,
        description: hero.description,
        image_url: hero.image_url,
        button_text: hero.button_text,
        button_url: hero.button_url,
        button2_text: hero.button2_text,
        button2_url: hero.button2_url,
        extra_data: {
          image_mode: hero.image_mode || 'fixed',
          selected_product_id: hero.selected_product_id || ''
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'section_key' });
      setHeroSaved(true);
      setTimeout(() => setHeroSaved(false), 3000);
    } catch (e) { alert('Erro ao salvar: ' + e.message); }
    finally { setHeroSaving(false); }
  };

  const handleHeroFileUpload = async (file) => {
    if (!file) return;
    setHeroUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `hero_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('amoreja-assets')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('amoreja-assets').getPublicUrl(fileName);
      setHero(prev => ({ ...prev, image_url: urlData.publicUrl }));
    } catch (e) {
      const reader = new FileReader();
      reader.onload = (ev) => setHero(prev => ({ ...prev, image_url: ev.target.result }));
      reader.readAsDataURL(file);
    } finally {
      setHeroUploading(false);
    }
  };

  const getHeroPreviewImage = () => {
    if (hero.image_mode === 'recipe_fixed') {
      const selected = products.find(p => p.id === hero.selected_product_id);
      return selected?.image_url || hero.image_url;
    }
    if (hero.image_mode === 'carousel') {
      const withImg = products.filter(p => p.image_url);
      return withImg[0]?.image_url || hero.image_url;
    }
    return hero.image_url;
  };

  // ── Logo Save ──
  const saveLogo = async () => {
    setLogoSaving(true);
    try {
      await supabase.from('new_amoreja_site_content').upsert({
        section_key: 'logo',
        image_url: logo.url,
        updated_at: new Date().toISOString()
      }, { onConflict: 'section_key' });
      setLogoSaved(true);
      window.dispatchEvent(new CustomEvent('logo-updated', { detail: logo }));
      setTimeout(() => setLogoSaved(false), 3000);
    } catch (e) { alert('Erro ao salvar logo: ' + e.message); }
    finally { setLogoSaving(false); }
  };

  const handleLogoFileUpload = async (file) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('amoreja-assets')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('amoreja-assets').getPublicUrl(fileName);
      setLogo(prev => ({ ...prev, url: urlData.publicUrl }));
    } catch (e) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogo(prev => ({ ...prev, url: ev.target.result }));
      reader.readAsDataURL(file);
    } finally {
      setLogoUploading(false);
    }
  };

  // ── Diferenciais / Features Actions ──
  const saveFeatures = async () => {
    setFeaturesSaving(true);
    try {
      await supabase.from('new_amoreja_site_content').upsert({
        section_key: 'features',
        title: 'Diferenciais do Site',
        extra_data: features,
        updated_at: new Date().toISOString()
      }, { onConflict: 'section_key' });
      setFeaturesSaved(true);
      setTimeout(() => setFeaturesSaved(false), 3000);
    } catch (e) { alert('Erro ao salvar diferenciais: ' + e.message); }
    finally { setFeaturesSaving(false); }
  };

  const addFeatureItem = () => {
    const newItem = {
      id: Date.now().toString(),
      icon: 'Sparkles',
      title: 'Novo Diferencial',
      description: 'Descreva a vantagem ou diferencial aqui...',
      visible: true
    };
    setFeatures(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const removeFeatureItem = (id) => {
    setFeatures(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const updateFeatureItem = (id, field, value) => {
    setFeatures(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const toggleFeatureItemVisibility = (id) => {
    setFeatures(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, visible: item.visible === false ? true : false } : item)
    }));
  };

  const moveFeatureItem = (idx, direction) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= features.items.length) return;
    const newItems = [...features.items];
    [newItems[idx], newItems[newIdx]] = [newItems[newIdx], newItems[idx]];
    setFeatures(prev => ({ ...prev, items: newItems }));
  };

  const getIconComponent = (iconName) => {
    const match = AVAILABLE_ICONS.find(i => i.name === iconName);
    return match ? match.Icon : Sparkles;
  };

  // ── Instagram Feed Save ──
  const saveInstagramFeed = async () => {
    setInstagramSaving(true);
    try {
      await supabase.from('new_amoreja_site_content').upsert({
        section_key: 'instagram_feed',
        title: instagramFeed.title,
        subtitle: instagramFeed.subtitle,
        extra_data: {
          visible: instagramFeed.visible !== false,
          handle: instagramFeed.handle,
          instagram_url: instagramFeed.instagram_url
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'section_key' });
      setInstagramSaved(true);
      setTimeout(() => setInstagramSaved(false), 3000);
    } catch (e) { alert('Erro ao salvar feed do Instagram: ' + e.message); }
    finally { setInstagramSaving(false); }
  };

  // ── Banner Settings Save ──
  const saveBannerSettings = async () => {
    setBannerSaving(true);
    try {
      const { style, speed, height, gap, paddingTop, paddingBottom, showBgBlur, bgOpacity } = bannerSettings;
      await supabase.from('new_amoreja_site_content').upsert({
        section_key: 'banner_settings',
        title: style,
        subtitle: speed.toString(),
        description: JSON.stringify({ height, gap, paddingTop, paddingBottom, showBgBlur, bgOpacity }),
        updated_at: new Date().toISOString()
      }, { onConflict: 'section_key' });
      setBannerSaved(true);
      setTimeout(() => setBannerSaved(false), 3000);
    } catch (e) { alert('Erro ao salvar configurações do banner: ' + e.message); }
    finally { setBannerSaving(false); }
  };

  // ── Maratonas CRUD ──
  const handleMaratonaFileUpload = async (file) => {
    if (!file) return;
    setFormUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `maratona_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('produto_imagens')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('produto_imagens').getPublicUrl(fileName);
      setForm(prev => ({ ...prev, image_url: urlData.publicUrl }));
    } catch (e) {
      const reader = new FileReader();
      reader.onload = (ev) => setForm(prev => ({ ...prev, image_url: ev.target.result }));
      reader.readAsDataURL(file);
    } finally {
      setFormUploading(false);
    }
  };

  const handleBannerImageUpload = async (file) => {
    if (!file) return;
    setFormUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `banner_${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('produto_imagens')
        .upload(fileName, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('produto_imagens').getPublicUrl(fileName);
      setForm(prev => ({
        ...prev,
        banner_images: [...(prev.banner_images || []), {
          url: urlData.publicUrl,
          is_featured: false,
          featured_from: null,
          featured_until: null
        }]
      }));
    } catch (e) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(prev => ({
          ...prev,
          banner_images: [...(prev.banner_images || []), {
            url: ev.target.result,
            is_featured: false,
            featured_from: null,
            featured_until: null
          }]
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setFormUploading(false);
    }
  };

  const removeBannerImage = (idx) => {
    setForm(prev => {
      const newImages = [...(prev.banner_images || [])];
      newImages.splice(idx, 1);
      return { ...prev, banner_images: newImages };
    });
  };

  const toggleFeatured = (idx) => {
    setForm(prev => {
      const imgs = (prev.banner_images || []).map((img, i) =>
        i === idx ? { ...img, is_featured: !img.is_featured } : img
      );
      return { ...prev, banner_images: imgs };
    });
  };

  const updateFeaturedDate = (idx, field, value) => {
    setForm(prev => {
      const imgs = [...(prev.banner_images || [])];
      imgs[idx] = { ...imgs[idx], [field]: value || null };
      return { ...prev, banner_images: imgs };
    });
  };

  const openNewForm = () => {
    setEditId(null);
    setForm({ title: '', tag: 'Edição Especial', description: '', image_url: '', cta_text: 'Saber Como Participar', cta_url: '', visible: true, status: 'andamento', banner_images: [] });
    setShowForm(true);
  };

  const openEditForm = (m) => {
    setEditId(m.id);
    setForm({ title: m.title, tag: m.tag, description: m.description, image_url: m.image_url, cta_text: m.cta_text, cta_url: m.cta_url, visible: m.visible !== false, status: m.status || 'andamento', banner_images: m.banner_images || [] });
    setShowForm(true);
  };

  const saveMaratona = async () => {
    setSaving(true);
    try {
      if (editId) {
        await supabase.from('new_amoreja_maratonas').update(form).eq('id', editId);
      } else {
        const maxOrder = maratonas.reduce((max, m) => Math.max(max, m.sort_order || 0), 0);
        await supabase.from('new_amoreja_maratonas').insert([{ ...form, sort_order: maxOrder + 1 }]);
      }
      setShowForm(false);
      await loadData();
    } catch (e) { alert('Erro: ' + e.message); }
    finally { setSaving(false); }
  };

  const toggleVisibility = async (m) => {
    const nextVis = m.visible === false ? true : false;
    await supabase.from('new_amoreja_maratonas').update({ visible: nextVis }).eq('id', m.id);
    setMaratonas(prev => prev.map(x => x.id === m.id ? { ...x, visible: nextVis } : x));
  };

  const deleteMaratona = async (id) => {
    if (!confirm('Deletar esta maratona?')) return;
    await supabase.from('new_amoreja_maratonas').delete().eq('id', id);
    setMaratonas(prev => prev.filter(x => x.id !== id));
  };

  const moveOrder = async (id, direction) => {
    const idx = maratonas.findIndex(m => m.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= maratonas.length) return;
    const reordered = [...maratonas];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setMaratonas(reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('new_amoreja_maratonas').update({ sort_order: i }).eq('id', reordered[i].id);
    }
  };

  if (loading) {
    return <div className="cms-loading"><RefreshCw size={24} className="fa-spin" /> Carregando conteúdo...</div>;
  }

  return (
    <div className="cms-page">
      <div className="cms-header">
        <h1>📝 Gerenciar Conteúdo do Site</h1>
        <p>Organize e edite os elementos visuais do site divididos por página e categoria.</p>
      </div>

      {/* ═══════════════════ ABAS PRINCIPAIS DE NAVEGAÇÃO ═══════════════════ */}
      <div className="cms-tabs-container">
        <button
          type="button"
          onClick={() => setActiveTab('site')}
          className={`cms-tab-btn ${activeTab === 'site' ? 'active' : ''}`}
        >
          <span className="tab-icon">🌐</span>
          <div className="tab-text">
            <strong>Conteúdo Geral do Site</strong>
            <small>Logo da Navbar, Hero da Home e Diferenciais</small>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('maratonas')}
          className={`cms-tab-btn ${activeTab === 'maratonas' ? 'active' : ''}`}
        >
          <span className="tab-icon">🏆</span>
          <div className="tab-text">
            <strong>Página de Maratonas (/maratonas)</strong>
            <small>Banner Carrossel, Eventos e Destaques</small>
          </div>
          {maratonas.length > 0 && (
            <span className="tab-badge">{maratonas.length}</span>
          )}
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          ABA 1: CONTEÚDO GERAL DO SITE (NAVBAR + HOME)
          ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'site' && (
        <div className="cms-tab-content animate-fade-in">
          <div className="cms-tab-banner info">
            <span>ℹ️ <strong>Área do Site & Home:</strong> As alterações feitas nesta aba afetam o cabeçalho global (Navbar) e a página principal (Home).</span>
          </div>

          {/* ── LOGO SECTION ── */}
          <section className="cms-section">
            <div className="cms-section-title">
              <h2>🎨 Logo do Site (Navbar)</h2>
              <button onClick={saveLogo} disabled={logoSaving} className="cms-btn-save">
                {logoSaving ? <RefreshCw size={14} className="fa-spin" /> : <Save size={14} />}
                {logoSaved ? '✅ Salvo!' : 'Salvar Logo'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
              {/* Esquerda: Campos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="cms-form-group">
                  <label>Imagem do Logo (URL ou upload)</label>
                  <div className="cms-img-input">
                    <input
                      type="text"
                      value={logo.url}
                      onChange={e => setLogo({ ...logo, url: e.target.value })}
                      placeholder="https://... ou faça upload abaixo"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                    <label
                      htmlFor="logo-file-upload"
                      style={{ cursor: 'pointer', background: '#e1306c', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ImageIcon size={14} /> {logoUploading ? 'Enviando...' : 'Fazer Upload'}
                    </label>
                    <input
                      id="logo-file-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handleLogoFileUpload(e.target.files[0])}
                    />
                    {logo.url && (
                      <button
                        onClick={() => setLogo({ ...logo, url: '' })}
                        style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '5px 10px', fontSize: '0.78rem', color: '#888', cursor: 'pointer' }}
                      >
                        <X size={12} /> Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Direita: Preview */}
              <div>
                <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: '10px', fontWeight: '600' }}>PRÉVIA DO LOGO NA NAVBAR</p>
                <div style={{ background: '#fefcfb', border: '1.5px solid #ebd8cf', borderRadius: '12px', padding: '16px 24px', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {logo.url ? (
                    <img src={logo.url} alt="Logo" style={{ height: '38px', width: 'auto', objectFit: 'contain', borderRadius: '6px' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.8rem' }}>🧶</span>
                      <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#3d3431', fontFamily: '"Outfit", sans-serif' }}>Amoreja</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── HERO SECTION ── */}
          <section className="cms-section">
            <div className="cms-section-title">
              <h2>🏠 Hero — Seção Principal da Home</h2>
              <button onClick={saveHero} disabled={heroSaving} className="cms-btn-save">
                {heroSaving ? <RefreshCw size={14} className="fa-spin" /> : <Save size={14} />}
                {heroSaved ? '✅ Salvo!' : 'Salvar Hero'}
              </button>
            </div>

            <div className="cms-hero-grid">
              <div className="cms-form-group">
                <label>Subtítulo</label>
                <input type="text" value={hero.subtitle} onChange={e => setHero({ ...hero, subtitle: e.target.value })} placeholder="Ex: Mundo dos Amigurumis" />
              </div>
              <div className="cms-form-group full-width">
                <label>Título Principal</label>
                <input type="text" value={hero.title} onChange={e => setHero({ ...hero, title: e.target.value })} placeholder="Ex: Transformando fios em abraços quentinhos!" />
              </div>
              <div className="cms-form-group full-width">
                <label>Descrição</label>
                <textarea value={hero.description} onChange={e => setHero({ ...hero, description: e.target.value })} rows={3} placeholder="Descrição do hero..." />
              </div>
              <div className="cms-form-group">
                <label>Modo da Imagem Principal</label>
                <select
                  value={hero.image_mode || 'fixed'}
                  onChange={e => setHero({ ...hero, image_mode: e.target.value })}
                  className="cms-select"
                >
                  <option value="fixed">Imagem Fixa Personalizada</option>
                  <option value="recipe_fixed">Imagem de Receita Específica</option>
                  <option value="carousel">Carrossel de Imagens das Receitas</option>
                </select>
              </div>

              {hero.image_mode === 'recipe_fixed' ? (
                <div className="cms-form-group">
                  <label>Escolher Receita para Imagem Fixa</label>
                  <select
                    value={hero.selected_product_id || ''}
                    onChange={e => setHero({ ...hero, selected_product_id: e.target.value })}
                    className="cms-select"
                  >
                    <option value="">Selecione uma receita...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              ) : hero.image_mode === 'carousel' ? (
                <div className="cms-form-group" style={{ justifyContent: 'center' }}>
                  <p style={{ fontSize: '0.8rem', color: '#667781', margin: 0, padding: '12px 0 0 0' }}>
                    ℹ️ <strong>Modo Carrossel Ativo:</strong> As imagens de capa das receitas serão rotacionadas na página principal.
                  </p>
                </div>
              ) : (
                <div className="cms-form-group full-width">
                  <label>Imagem Fixa (URL ou Upload)</label>
                  <div className="cms-img-input">
                    <input type="text" value={hero.image_url} onChange={e => setHero({ ...hero, image_url: e.target.value })} placeholder="https://..." />
                    {hero.image_url && <img src={hero.image_url} alt="Preview" className="cms-img-preview-small" />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                    <label
                      htmlFor="hero-file-upload"
                      style={{ cursor: 'pointer', background: '#e1306c', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ImageIcon size={14} /> {heroUploading ? 'Enviando...' : 'Fazer Upload'}
                    </label>
                    <input
                      id="hero-file-upload"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handleHeroFileUpload(e.target.files[0])}
                    />
                    {hero.image_url && (
                      <button
                        onClick={() => setHero({ ...hero, image_url: '' })}
                        style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '5px 10px', fontSize: '0.78rem', color: '#888', cursor: 'pointer' }}
                      >
                        <X size={12} /> Remover
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div className="cms-form-group">
                <label>Botão 1 — Texto</label>
                <input type="text" value={hero.button_text} onChange={e => setHero({ ...hero, button_text: e.target.value })} />
              </div>
              <div className="cms-form-group">
                <label>Botão 1 — Link</label>
                <input type="text" value={hero.button_url} onChange={e => setHero({ ...hero, button_url: e.target.value })} />
              </div>
              <div className="cms-form-group">
                <label>Botão 2 — Texto</label>
                <input type="text" value={hero.button2_text} onChange={e => setHero({ ...hero, button2_text: e.target.value })} />
              </div>
              <div className="cms-form-group">
                <label>Botão 2 — Link</label>
                <input type="text" value={hero.button2_url} onChange={e => setHero({ ...hero, button2_url: e.target.value })} />
              </div>
            </div>

            {/* Preview */}
            <div className="cms-hero-preview">
              <span className="preview-tag">Preview</span>
              <div className="hero-preview-card">
                <div className="hero-preview-left">
                  <span className="hero-preview-sub">{hero.subtitle}</span>
                  <h2>{hero.title}</h2>
                  <p>{hero.description}</p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <span className="btn-preview-primary">{hero.button_text}</span>
                    <span className="btn-preview-outline">{hero.button2_text}</span>
                  </div>
                </div>
                {getHeroPreviewImage() && <img src={getHeroPreviewImage()} alt="Hero" className="hero-preview-img" />}
              </div>
            </div>
          </section>

          {/* ── DIFERENCIAIS / FEATURES ── */}
          <section className="cms-section">
            <div className="cms-section-title">
              <div>
                <h2>✨ Diferenciais / Destaques da Home</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#667781' }}>
                  Personalize os cards explicativos que aparecem na Home (ícones, títulos, descrições e visibilidade).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={addFeatureItem} className="cms-btn-new">
                  <Plus size={14} /> Novo Diferencial
                </button>
                <button onClick={saveFeatures} disabled={featuresSaving} className="cms-btn-save">
                  {featuresSaving ? <RefreshCw size={14} className="fa-spin" /> : <Save size={14} />}
                  {featuresSaved ? '✅ Salvo!' : 'Salvar Diferenciais'}
                </button>
              </div>
            </div>

            {/* Toggle Geral da Seção */}
            <div className="cms-form-group cms-toggle-row" style={{ background: '#f8f9fa', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
              <div>
                <label style={{ fontWeight: '700', marginBottom: '2px' }}>Exibir Seção de Diferenciais na Home</label>
                <small style={{ color: '#888', display: 'block' }}>
                  {features.visible !== false ? 'A seção está visível para os visitantes da Home.' : 'A seção está oculta na página inicial.'}
                </small>
              </div>
              <button
                type="button"
                onClick={() => setFeatures(prev => ({ ...prev, visible: prev.visible === false ? true : false }))}
                className={`cms-toggle ${features.visible !== false ? 'on' : 'off'}`}
              >
                {features.visible !== false ? 'Visível' : 'Oculto'}
              </button>
            </div>

            {/* Lista de Itens dos Diferenciais */}
            <div className="cms-features-list">
              {(features.items || []).map((item, idx) => {
                const IconComponent = getIconComponent(item.icon);
                const isPickerOpen = activeIconPickerId === item.id;

                return (
                  <div key={item.id} className={`cms-feature-card ${item.visible === false ? 'hidden-card' : ''}`}>
                    <div className="cms-feature-top-bar">
                      <div className="cms-feature-left-badge">
                        <span className="cms-feature-idx">#{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => toggleFeatureItemVisibility(item.id)}
                          className={`cms-visibility-badge ${item.visible !== false ? 'vis-on' : 'vis-off'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title={item.visible !== false ? 'Clique para ocultar este item' : 'Clique para exibir este item'}
                        >
                          {item.visible !== false ? <><Eye size={12} /> Exibindo na Home</> : <><EyeOff size={12} /> Oculto na Home</>}
                        </button>
                      </div>

                      <div className="cms-feature-card-actions">
                        <button
                          type="button"
                          onClick={() => moveFeatureItem(idx, -1)}
                          disabled={idx === 0}
                          className="cms-order-btn"
                          title="Mover para cima"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFeatureItem(idx, 1)}
                          disabled={idx === (features.items || []).length - 1}
                          className="cms-order-btn"
                          title="Mover para baixo"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFeatureItem(item.id)}
                          className="cms-action-btn delete"
                          title="Excluir este diferencial"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="cms-feature-body">
                      {/* Seletor de Ícone */}
                      <div className="cms-feature-icon-column">
                        <div className="cms-feature-current-icon">
                          <IconComponent size={28} />
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveIconPickerId(isPickerOpen ? null : item.id)}
                          className="cms-btn-pick-icon"
                        >
                          {isPickerOpen ? 'Fechar Ícones' : 'Trocar Ícone'}
                        </button>
                      </div>

                      {/* Inputs de Título e Descrição */}
                      <div className="cms-feature-inputs">
                        <div className="cms-form-group">
                          <label>Título do Diferencial</label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={e => updateFeatureItem(item.id, 'title', e.target.value)}
                            placeholder="Ex: PDFs Passo a Passo"
                          />
                        </div>
                        <div className="cms-form-group">
                          <label>Descrição do Diferencial</label>
                          <textarea
                            value={item.description}
                            onChange={e => updateFeatureItem(item.id, 'description', e.target.value)}
                            rows={2}
                            placeholder="Ex: Receitas extremamente organizadas..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Grade de Seleção de Ícone */}
                    {isPickerOpen && (
                      <div className="cms-icon-picker-grid">
                        <div className="cms-picker-title">
                          <span>Selecione um ícone para este diferencial:</span>
                          <button type="button" onClick={() => setActiveIconPickerId(null)} className="cms-picker-close">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="cms-icons-scroll">
                          {AVAILABLE_ICONS.map(({ name, label, Icon }) => {
                            const isSelected = item.icon === name;
                            return (
                              <button
                                key={name}
                                type="button"
                                className={`cms-icon-opt ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  updateFeatureItem(item.id, 'icon', name);
                                  setActiveIconPickerId(null);
                                }}
                                title={label}
                              >
                                <Icon size={20} />
                                <span>{label}</span>
                                {isSelected && <Check size={12} className="check-mark" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Prévia ao vivo */}
            <div style={{ marginTop: '24px' }}>
              <p style={{ fontSize: '0.8rem', color: '#888', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>
                PRÉVIA VISUAL NA PÁGINA INICIAL (HOME)
              </p>
              <div className="cms-features-preview-box">
                {features.visible === false ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontStyle: 'italic' }}>
                    A seção de diferenciais está configurada como <strong>OCULTA</strong> e não aparecerá na Home.
                  </div>
                ) : (
                  <div className="cms-preview-features-grid">
                    {(features.items || []).filter(i => i.visible !== false).map(item => {
                      const IconComp = getIconComponent(item.icon);
                      return (
                        <div key={item.id} className="cms-preview-feature-item">
                          <div className="cms-preview-feature-icon">
                            <IconComp size={24} />
                          </div>
                          <h4>{item.title || 'Título'}</h4>
                          <p>{item.description || 'Descrição...'}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── INSTAGRAM FEED SECTION ── */}
          <section className="cms-section">
            <div className="cms-section-title">
              <div>
                <h2>📸 Feed do Instagram (Home)</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#667781' }}>
                  Controle a ativação, desativação e textos do bloco de feed do Instagram na página inicial.
                </p>
              </div>
              <button onClick={saveInstagramFeed} disabled={instagramSaving} className="cms-btn-save">
                {instagramSaving ? <RefreshCw size={14} className="fa-spin" /> : <Save size={14} />}
                {instagramSaved ? '✅ Salvo!' : 'Salvar Instagram'}
              </button>
            </div>

            {/* Toggle Geral da Seção do Instagram */}
            <div className="cms-form-group cms-toggle-row" style={{ background: '#f8f9fa', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
              <div>
                <label style={{ fontWeight: '700', marginBottom: '2px' }}>Exibir Feed do Instagram na Home</label>
                <small style={{ color: '#888', display: 'block' }}>
                  {instagramFeed.visible !== false ? 'O bloco do Instagram está visível na parte inferior da Home.' : 'O bloco do Instagram está desativado / oculto na Home.'}
                </small>
              </div>
              <button
                type="button"
                onClick={() => setInstagramFeed(prev => ({ ...prev, visible: prev.visible === false ? true : false }))}
                className={`cms-toggle ${instagramFeed.visible !== false ? 'on' : 'off'}`}
              >
                {instagramFeed.visible !== false ? 'Visível (Ativado)' : 'Oculto (Desativado)'}
              </button>
            </div>

            <div className="cms-hero-grid">
              <div className="cms-form-group full-width">
                <label>Título da Seção</label>
                <input
                  type="text"
                  value={instagramFeed.title}
                  onChange={e => setInstagramFeed({ ...instagramFeed, title: e.target.value })}
                  placeholder="Ex: Nosso Feed do Instagram"
                />
              </div>

              <div className="cms-form-group">
                <label>Nome do Perfil / Handle</label>
                <input
                  type="text"
                  value={instagramFeed.handle}
                  onChange={e => setInstagramFeed({ ...instagramFeed, handle: e.target.value })}
                  placeholder="Ex: @amorejaamigurumi"
                />
              </div>

              <div className="cms-form-group">
                <label>Link do Perfil no Instagram</label>
                <input
                  type="text"
                  value={instagramFeed.instagram_url}
                  onChange={e => setInstagramFeed({ ...instagramFeed, instagram_url: e.target.value })}
                  placeholder="https://www.instagram.com/amorejaamigurumi/"
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          ABA 2: PÁGINA DE MARATONAS (/maratonas)
          ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'maratonas' && (
        <div className="cms-tab-content animate-fade-in">
          <div className="cms-tab-banner maratona">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', width: '100%' }}>
              <span>🏆 <strong>Área de Maratonas:</strong> Todas as configurações e eventos abaixo são exibidos na página exclusiva <code>/maratonas</code>.</span>
              <a
                href="/maratonas"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fff', color: '#df6951', border: '1px solid #df6951', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', textDecoration: 'none' }}
              >
                Abrir Página de Maratonas <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* ── BANNER SETTINGS (MARATONAS) ── */}
          <section className="cms-section">
            <div className="cms-section-title">
              <h2>🎠 Configurações do Banner de Maratonas</h2>
              <button onClick={saveBannerSettings} disabled={bannerSaving} className="cms-btn-save">
                {bannerSaving ? <RefreshCw size={14} className="fa-spin" /> : <Save size={14} />}
                {bannerSaved ? '✅ Salvo!' : 'Salvar Configurações'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Estilo */}
              <div className="cms-form-group">
                <label>Estilo de Exibição</label>
                <select
                  value={bannerSettings.style}
                  onChange={e => setBannerSettings({...bannerSettings, style: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                >
                  <option value="carousel">Passar Sozinho (Carrossel / Intervalo)</option>
                  <option value="marquee">Deslizar Continuamente (Marquee)</option>
                </select>
              </div>

              {/* Velocidade */}
              <div className="cms-form-group">
                <label>
                  Velocidade &nbsp;
                  <span style={{ fontWeight: '400', color: '#888' }}>({bannerSettings.speed}s)</span>
                </label>
                <input
                  type="range" min="1" max="20"
                  value={bannerSettings.speed}
                  onChange={e => setBannerSettings({...bannerSettings, speed: parseInt(e.target.value)})}
                  style={{ width: '100%' }}
                />
                <small style={{ color: '#888' }}>
                  {bannerSettings.style === 'carousel' ? 'Tempo de exibição de cada imagem.' : 'Velocidade do scroll contínuo.'}
                </small>
              </div>

              {/* Altura */}
              <div className="cms-form-group">
                <label>
                  Altura do Banner &nbsp;
                  <span style={{ fontWeight: '400', color: '#888' }}>({bannerSettings.height}px)</span>
                </label>
                <input
                  type="range" min="200" max="700" step="10"
                  value={bannerSettings.height}
                  onChange={e => setBannerSettings({...bannerSettings, height: parseInt(e.target.value)})}
                  style={{ width: '100%' }}
                />
                <small style={{ color: '#888' }}>Altura total do banner na página de maratonas.</small>
              </div>

              {/* Gap */}
              <div className="cms-form-group">
                <label>
                  Espaçamento entre Imagens &nbsp;
                  <span style={{ fontWeight: '400', color: '#888' }}>({bannerSettings.gap}px)</span>
                </label>
                <input
                  type="range" min="0" max="40" step="2"
                  value={bannerSettings.gap}
                  onChange={e => setBannerSettings({...bannerSettings, gap: parseInt(e.target.value)})}
                  style={{ width: '100%' }}
                />
                <small style={{ color: '#888' }}>Distância entre os slides.</small>
              </div>

              {/* Padding Top */}
              <div className="cms-form-group">
                <label>
                  Borda Superior das Imagens &nbsp;
                  <span style={{ fontWeight: '400', color: '#888' }}>({bannerSettings.paddingTop}px)</span>
                </label>
                <input
                  type="range" min="0" max="60" step="4"
                  value={bannerSettings.paddingTop}
                  onChange={e => setBannerSettings({...bannerSettings, paddingTop: parseInt(e.target.value)})}
                  style={{ width: '100%' }}
                />
                <small style={{ color: '#888' }}>Espaço acima de cada imagem.</small>
              </div>

              {/* Padding Bottom */}
              <div className="cms-form-group">
                <label>
                  Borda Inferior das Imagens &nbsp;
                  <span style={{ fontWeight: '400', color: '#888' }}>({bannerSettings.paddingBottom}px)</span>
                </label>
                <input
                  type="range" min="0" max="60" step="4"
                  value={bannerSettings.paddingBottom}
                  onChange={e => setBannerSettings({...bannerSettings, paddingBottom: parseInt(e.target.value)})}
                  style={{ width: '100%' }}
                />
                <small style={{ color: '#888' }}>Espaço abaixo de cada imagem.</small>
              </div>

              {/* Fundo desfocado */}
              <div className="cms-form-group cms-toggle-row" style={{ gridColumn: '1 / -1', background: '#f8f9ff', padding: '14px', borderRadius: '10px', border: '1.5px solid #e0e7ff' }}>
                <div>
                  <label style={{ fontWeight: '700', marginBottom: '4px' }}>Usar imagem oficial da maratona como fundo</label>
                  <small style={{ display: 'block', color: '#888', marginTop: '2px' }}>
                    Mostra a imagem oficial levemente desfocada por trás das fotos do carrossel.
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => setBannerSettings({...bannerSettings, showBgBlur: !bannerSettings.showBgBlur})}
                  className={`cms-toggle ${bannerSettings.showBgBlur ? 'on' : 'off'}`}
                >
                  {bannerSettings.showBgBlur ? 'Sim' : 'Não'}
                </button>
              </div>

              {/* Opacidade das imagens de fundo */}
              <div className="cms-form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: '700' }}>
                  Opacidade das Imagens Rodando no Fundo &nbsp;
                  <span style={{ fontWeight: '400', color: '#888' }}>({Math.round(bannerSettings.bgOpacity * 100)}%)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#aaa', width: '32px' }}>0%</span>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={bannerSettings.bgOpacity}
                    onChange={e => setBannerSettings({...bannerSettings, bgOpacity: parseFloat(e.target.value)})}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#aaa', width: '36px', textAlign: 'right' }}>100%</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── MARATONAS E EVENTOS ── */}
          <section className="cms-section">
            <div className="cms-section-title">
              <div>
                <h2>🏆 Maratonas & Eventos Cadastrados</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#667781' }}>
                  Cadastre e gerencie os eventos que aparecem na página <code>/maratonas</code>.
                </p>
              </div>
              <button onClick={openNewForm} className="cms-btn-new">
                <Plus size={14} /> Nova Maratona
              </button>
            </div>

            {maratonas.length === 0 ? (
              <div className="cms-empty">Nenhuma maratona cadastrada. Clique em "Nova Maratona" para criar.</div>
            ) : (
              <div className="cms-maratona-list">
                {maratonas.map((m, idx) => (
                  <div key={m.id} className={`cms-maratona-card ${m.visible === false ? 'hidden-card' : ''}`}>
                    <div className="cms-maratona-order">
                      <button onClick={() => moveOrder(m.id, -1)} disabled={idx === 0} className="cms-order-btn"><ChevronUp size={14} /></button>
                      <button onClick={() => moveOrder(m.id, 1)} disabled={idx === maratonas.length - 1} className="cms-order-btn"><ChevronDown size={14} /></button>
                    </div>
                    {m.image_url ? (
                      <img src={m.image_url} alt={m.title} className="cms-maratona-thumb" />
                    ) : (
                      <div className="cms-maratona-thumb-placeholder">🧶</div>
                    )}
                    <div className="cms-maratona-info">
                      <div className="cms-maratona-top">
                        <span className="cms-maratona-tag">{m.tag || 'Maratona'}</span>
                        {m.status === 'finalizada' && (
                          <span className="cms-maratona-tag" style={{background: '#6c757d', color: 'white'}}>⚪ Finalizada</span>
                        )}
                        {m.status === 'andamento' && (
                          <span className="cms-maratona-tag" style={{background: '#28a745', color: 'white'}}>🟢 Em Andamento</span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleVisibility(m)}
                          className={`cms-visibility-badge ${m.visible !== false ? 'vis-on' : 'vis-off'}`}
                          style={{ cursor: 'pointer', border: 'none' }}
                          title={m.visible !== false ? 'Clique para ocultar em /maratonas' : 'Clique para exibir em /maratonas'}
                        >
                          {m.visible !== false ? <><Eye size={12} /> Visível em /maratonas</> : <><EyeOff size={12} /> Oculto em /maratonas</>}
                        </button>
                      </div>
                      <h3>{m.title}</h3>
                      <p>{m.description?.substring(0, 140)}{m.description?.length > 140 ? '...' : ''}</p>
                      {m.banner_images && m.banner_images.length > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#888' }}>
                          📸 <strong>{m.banner_images.length} imagem(ns)</strong> no banner ({m.banner_images.filter(i => (typeof i === 'object' && i.is_featured)).length} em destaque/coverflow)
                        </div>
                      )}
                    </div>
                    <div className="cms-maratona-actions">
                      <button onClick={() => toggleVisibility(m)} className="cms-action-btn" title={m.visible !== false ? 'Ocultar em /maratonas' : 'Mostrar em /maratonas'}>
                        {m.visible !== false ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button onClick={() => openEditForm(m)} className="cms-action-btn edit" title="Editar">✏️ Editar</button>
                      <button onClick={() => deleteMaratona(m.id)} className="cms-action-btn delete" title="Deletar"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ═══════════════════ MODAL MARATONA ═══════════════════ */}
      {showForm && (
        <div className="cms-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="cms-modal" onClick={e => e.stopPropagation()}>
            <div className="cms-modal-header">
              <h3>{editId ? 'Editar Maratona' : 'Nova Maratona'}</h3>
              <button onClick={() => setShowForm(false)} className="cms-modal-close"><X size={18} /></button>
            </div>
            <div className="cms-modal-body">
              <div className="cms-form-group">
                <label>Tag / Categoria</label>
                <input type="text" value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} placeholder="Ex: Maratona de Amigurumis" />
              </div>
              <div className="cms-form-group">
                <label>Título da Maratona *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Festival das Estações" />
              </div>
              <div className="cms-form-group">
                <label>Descrição do Evento</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Descreva o evento, regras, cronograma..." />
              </div>
              <div className="cms-form-group">
                <label>URL da Imagem Oficial</label>
                <div className="cms-img-input">
                  <input type="text" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://... ou faça upload abaixo" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <label
                    htmlFor="maratona-file-upload"
                    style={{ cursor: 'pointer', background: '#e1306c', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ImageIcon size={14} /> {formUploading ? 'Enviando...' : 'Fazer Upload'}
                  </label>
                  <input
                    id="maratona-file-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleMaratonaFileUpload(e.target.files[0])}
                  />
                  {form.image_url && (
                    <button
                      onClick={() => setForm({ ...form, image_url: '' })}
                      style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '5px 10px', fontSize: '0.78rem', color: '#888', cursor: 'pointer' }}
                    >
                      <X size={12} /> Remover
                    </button>
                  )}
                </div>
              </div>

              {/* Status da Maratona */}
              <div className="cms-form-group">
                <label>Status do Evento</label>
                <select
                  value={form.status || 'andamento'}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                >
                  <option value="andamento">🟢 Em Andamento</option>
                  <option value="finalizada">⚪ Finalizada</option>
                </select>
              </div>

              {/* Visibilidade */}
              <div className="cms-form-group cms-toggle-row" style={{ background: '#f8f9fa', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <label style={{ fontWeight: '700', margin: 0 }}>Exibir na Página /maratonas</label>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, visible: !prev.visible }))}
                  className={`cms-toggle ${form.visible !== false ? 'on' : 'off'}`}
                >
                  {form.visible !== false ? 'Visível' : 'Oculto'}
                </button>
              </div>

              {/* CTA */}
              <div className="cms-form-group">
                <label>Texto do Botão de Inscrição / Grupo (CTA)</label>
                <input type="text" value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })} placeholder="Ex: Saber Como Participar" />
              </div>
              <div className="cms-form-group">
                <label>Link do Botão (CTA)</label>
                <input type="text" value={form.cta_url} onChange={e => setForm({ ...form, cta_url: e.target.value })} placeholder="https://instagram.com/... ou https://chat.whatsapp.com/..." />
              </div>

              {/* Imagens do Banner da Maratona */}
              <div className="cms-form-group" style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0, fontWeight: '700' }}>Imagens do Banner / Coverflow desta Maratona</label>
                  <label
                    htmlFor="banner-item-upload"
                    style={{ cursor: 'pointer', background: '#10a37f', color: 'white', borderRadius: '6px', padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={12} /> Adicionar Foto
                  </label>
                  <input
                    id="banner-item-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => handleBannerImageUpload(e.target.files[0])}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(form.banner_images || []).map((img, idx) => {
                    const imgObj = typeof img === 'string'
                      ? { url: img, is_featured: false, featured_from: null, featured_until: null }
                      : img;

                    return (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fafafa', padding: '8px', borderRadius: '8px', border: '1px solid #eee' }}>
                        <img src={imgObj.url} alt="" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                        <div style={{ flex: 1, fontSize: '0.8rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '600' }}>
                            <input
                              type="checkbox"
                              checked={imgObj.is_featured}
                              onChange={() => toggleFeatured(idx)}
                            />
                            Destaque no Banner (Coverflow)
                          </label>
                          {imgObj.is_featured && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <input
                                type="date"
                                value={imgObj.featured_from || ''}
                                onChange={e => updateFeaturedDate(idx, 'featured_from', e.target.value)}
                                style={{ fontSize: '0.75rem', padding: '2px 4px' }}
                                title="Data de Início"
                              />
                              <input
                                type="date"
                                value={imgObj.featured_until || ''}
                                onChange={e => updateFeaturedDate(idx, 'featured_until', e.target.value)}
                                style={{ fontSize: '0.75rem', padding: '2px 4px' }}
                                title="Data de Término"
                              />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBannerImage(idx)}
                          style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="cms-modal-footer">
              <button onClick={() => setShowForm(false)} className="cms-btn-cancel">Cancelar</button>
              <button onClick={saveMaratona} disabled={saving} className="cms-btn-save">
                {saving ? 'Salvando...' : 'Salvar Maratona'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
