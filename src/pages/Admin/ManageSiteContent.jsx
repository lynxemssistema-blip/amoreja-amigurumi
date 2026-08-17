import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { Save, Plus, Trash2, Eye, EyeOff, GripVertical, Image as ImageIcon, RefreshCw, X, ChevronUp, ChevronDown } from 'lucide-react';
import './ManageSiteContent.css';

export default function ManageSiteContent() {
  // ── Hero state ──
  const [hero, setHero] = useState({
    subtitle: 'Mundo dos Amigurumis',
    title: 'Transformando fios em abraços quentinhos!',
    description: 'Crie amigurumis encantadores com receitas detalhadas, passo a passo ilustrado e suporte completo para você tecer amor em cada ponto.',
    image_url: '',
    button_text: 'Ver Receitas em PDF',
    button_url: '/loja',
    button2_text: 'Entrar no Grupo',
    button2_url: ''
  });
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroSaved, setHeroSaved] = useState(false);

  // ── Logo state ──
  const [logo, setLogo] = useState({ url: '', text: 'Amoreja', subtext: 'Amigurumi' });
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [bannerSettings, setBannerSettings] = useState({
    style: 'carousel',
    speed: 4,
    height: 420,
    gap: 0,
    paddingTop: 0,
    paddingBottom: 0,
    showBgBlur: true,
    bgOpacity: 0.55        // opacidade das imagens de fundo (0 = invisível, 1 = opaca)
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
      // Hero
      const { data: heroData } = await supabase
        .from('new_amoreja_site_content')
        .select('*')
        .eq('section_key', 'hero')
        .maybeSingle();
      if (heroData) {
        setHero({
          subtitle: heroData.subtitle || '',
          title: heroData.title || '',
          description: heroData.description || '',
          image_url: heroData.image_url || '',
          button_text: heroData.button_text || '',
          button_url: heroData.button_url || '',
          button2_text: heroData.button2_text || '',
          button2_url: heroData.button2_url || ''
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
          url: logoData.image_url || '',
          text: logoData.title || 'Amoreja',
          subtext: logoData.subtitle || 'Amigurumi'
        });
      }

      // Banner Settings
      const { data: bannerData } = await supabase
        .from('new_amoreja_site_content')
        .select('*')
        .eq('section_key', 'banner_settings')
        .maybeSingle();
      if (bannerData) {
        // Tenta ler os campos extras do campo `description` (armazenado como JSON)
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
        ...hero,
        updated_at: new Date().toISOString()
      }, { onConflict: 'section_key' });
      setHeroSaved(true);
      setTimeout(() => setHeroSaved(false), 3000);
    } catch (e) { alert('Erro ao salvar: ' + e.message); }
    finally { setHeroSaving(false); }
  };

  const saveLogo = async () => {
    setLogoSaving(true);
    try {
      await supabase.from('new_amoreja_site_content').upsert({
        section_key: 'logo',
        image_url: logo.url,
        title: logo.text,
        subtitle: logo.subtext,
        updated_at: new Date().toISOString()
      }, { onConflict: 'section_key' });
      setLogoSaved(true);
      window.dispatchEvent(new CustomEvent('logo-updated', { detail: logo }));
      setTimeout(() => setLogoSaved(false), 3000);
    } catch (e) { alert('Erro ao salvar logo: ' + e.message); }
    finally { setLogoSaving(false); }
  };

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
      // Fallback: lê como data URL local
      const reader = new FileReader();
      reader.onload = (ev) => setLogo(prev => ({ ...prev, url: ev.target.result }));
      reader.readAsDataURL(file);
    } finally {
      setLogoUploading(false);
    }
  };

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
      // Fallback: lê como data URL local
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
      // Fallback
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

  // Alterna o destaque de uma imagem — múltiplas podem ser destaque (coverflow)
  const toggleFeatured = (idx) => {
    setForm(prev => {
      const imgs = (prev.banner_images || []).map((img, i) =>
        i === idx ? { ...img, is_featured: !img.is_featured } : img
      );
      return { ...prev, banner_images: imgs };
    });
  };

  // Atualiza a data de início/fim de destaque de uma imagem
  const updateFeaturedDate = (idx, field, value) => {
    setForm(prev => {
      const imgs = [...(prev.banner_images || [])];
      imgs[idx] = { ...imgs[idx], [field]: value || null };
      return { ...prev, banner_images: imgs };
    });
  };

  // Garante compatibilidade com formato antigo (strings puras)
  const normalizeBannerImages = (imgs) => {
    if (!imgs) return [];
    return imgs.map(img => {
      if (typeof img === 'string') {
        return { url: img, is_featured: false, featured_from: null, featured_until: null };
      }
      return img;
    });
  };

  // ── Maratona CRUD ──
  const openNewForm = () => {
    setEditId(null);
    setForm({ title: '', tag: 'Edição Especial', description: '', image_url: '', cta_text: 'Saber Como Participar', cta_url: '', visible: true, status: 'andamento', banner_images: [] });
    setShowForm(true);
  };

  const openEditForm = (m) => {
    setEditId(m.id);
    setForm({ title: m.title, tag: m.tag, description: m.description, image_url: m.image_url, cta_text: m.cta_text, cta_url: m.cta_url, visible: m.visible, status: m.status || 'andamento', banner_images: m.banner_images || [] });
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
    await supabase.from('new_amoreja_maratonas').update({ visible: !m.visible }).eq('id', m.id);
    setMaratonas(prev => prev.map(x => x.id === m.id ? { ...x, visible: !x.visible } : x));
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
        <p>Edite os textos, imagens e seções visíveis na página principal.</p>
      </div>

      {/* ═══════════════════ LOGO SECTION ═══════════════════ */}
      <section className="cms-section">
        <div className="cms-section-title">
          <h2>🎨 Logo do Site</h2>
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

            <div className="cms-form-group">
              <label>Texto do Logo</label>
              <input
                type="text"
                value={logo.text}
                onChange={e => setLogo({ ...logo, text: e.target.value })}
                placeholder="Ex: Amoreja"
              />
            </div>

            <div className="cms-form-group">
              <label>Subtexto do Logo</label>
              <input
                type="text"
                value={logo.subtext}
                onChange={e => setLogo({ ...logo, subtext: e.target.value })}
                placeholder="Ex: Amigurumi"
              />
            </div>
          </div>

          {/* Direita: Preview */}
          <div>
            <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: '10px', fontWeight: '600' }}>PRÉVIA DO LOGO NA NAVBAR</p>
            <div style={{ background: '#fefcfb', border: '1.5px solid #ebd8cf', borderRadius: '12px', padding: '16px 24px', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {logo.url ? (
                <img src={logo.url} alt="Logo" style={{ height: '38px', width: 'auto', objectFit: 'contain', borderRadius: '6px' }} />
              ) : (
                <span style={{ fontSize: '1.8rem' }}>🧶</span>
              )}
              <div>
                <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#3d3431', fontFamily: '"Outfit", sans-serif' }}>{logo.text || 'Amoreja'}</span>
                {logo.subtext && (
                  <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#e1306c', color: 'white', borderRadius: '4px', padding: '2px 7px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{logo.subtext}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <section className="cms-section">
        <div className="cms-section-title">
          <h2>🏠 Hero — Seção Principal</h2>
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
          <div className="cms-form-group full-width">
            <label>URL da Imagem</label>
            <div className="cms-img-input">
              <input type="text" value={hero.image_url} onChange={e => setHero({ ...hero, image_url: e.target.value })} placeholder="https://..." />
              {hero.image_url && <img src={hero.image_url} alt="Preview" className="cms-img-preview-small" />}
            </div>
          </div>
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
            {hero.image_url && <img src={hero.image_url} alt="Hero" className="hero-preview-img" />}
          </div>
        </div>
      </section>

      {/* ═══════════════════ BANNER SETTINGS ═══════════════════ */}
      <section className="cms-section">
        <div className="cms-section-title">
          <h2>🎠 Configurações do Banner (Carrossel)</h2>
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
            <small style={{ color: '#888' }}>Altura total do banner na página.</small>
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
            {/* Barra visual de preview da opacidade */}
            <div style={{ marginTop: '8px', height: '28px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e5e7eb', background: '#1a1a2e' }}>
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '32px', height: '18px', borderRadius: '3px',
                      background: `rgba(255, 180, 140, ${bannerSettings.bgOpacity})`,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  />
                ))}
              </div>
            </div>
            <small style={{ color: '#888', marginTop: '4px', display: 'block' }}>
              0% = imagens invisíveis (só fundo). 100% = imagens totalmente visíveis.
            </small>
          </div>

        </div>

        {/* Mini preview dos valores */}
        <div style={{ marginTop: '14px', background: '#f1f5f9', borderRadius: '8px', padding: '12px 16px', fontSize: '0.78rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          <span>📏 <strong>Altura:</strong> {bannerSettings.height}px</span>
          <span>↔️ <strong>Gap:</strong> {bannerSettings.gap}px</span>
          <span>⬆️ <strong>Borda superior:</strong> {bannerSettings.paddingTop}px</span>
          <span>⬇️ <strong>Borda inferior:</strong> {bannerSettings.paddingBottom}px</span>
          <span>🎨 <strong>Fundo blur:</strong> {bannerSettings.showBgBlur ? 'Ativo' : 'Inativo'}</span>
          <span>🔍 <strong>Opacidade fundo:</strong> {Math.round(bannerSettings.bgOpacity * 100)}%</span>
        </div>
      </section>

      {/* ═══════════════════ MARATONAS ═══════════════════ */}
      <section className="cms-section">
        <div className="cms-section-title">
          <h2>🏆 Maratonas / Eventos</h2>
          <button onClick={openNewForm} className="cms-btn-new">
            <Plus size={14} /> Nova Maratona
          </button>
        </div>

        {maratonas.length === 0 ? (
          <div className="cms-empty">Nenhuma maratona cadastrada. Clique em "Nova Maratona" para criar.</div>
        ) : (
          <div className="cms-maratona-list">
            {maratonas.map((m, idx) => (
              <div key={m.id} className={`cms-maratona-card ${!m.visible ? 'hidden-card' : ''}`}>
                <div className="cms-maratona-order">
                  <button onClick={() => moveOrder(m.id, -1)} disabled={idx === 0} className="cms-order-btn"><ChevronUp size={14} /></button>
                  <button onClick={() => moveOrder(m.id, 1)} disabled={idx === maratonas.length - 1} className="cms-order-btn"><ChevronDown size={14} /></button>
                </div>
                {m.image_url && <img src={m.image_url} alt={m.title} className="cms-maratona-thumb" />}
                <div className="cms-maratona-info">
                  <div className="cms-maratona-top">
                    <span className="cms-maratona-tag">{m.tag}</span>
                    {m.status === 'finalizada' && (
                      <span className="cms-maratona-tag" style={{background: '#6c757d', color: 'white'}}>Finalizada</span>
                    )}
                    {m.status === 'andamento' && (
                      <span className="cms-maratona-tag" style={{background: '#28a745', color: 'white'}}>Em Andamento</span>
                    )}
                    <span className={`cms-visibility-badge ${m.visible ? 'vis-on' : 'vis-off'}`}>
                      {m.visible ? <><Eye size={12} /> Visível</> : <><EyeOff size={12} /> Oculto</>}
                    </span>
                  </div>
                  <h3>{m.title}</h3>
                  <p>{m.description?.substring(0, 120)}{m.description?.length > 120 ? '...' : ''}</p>
                </div>
                <div className="cms-maratona-actions">
                  <button onClick={() => toggleVisibility(m)} className="cms-action-btn" title={m.visible ? 'Ocultar' : 'Mostrar'}>
                    {m.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button onClick={() => openEditForm(m)} className="cms-action-btn edit" title="Editar">✏️</button>
                  <button onClick={() => deleteMaratona(m.id)} className="cms-action-btn delete" title="Deletar"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
                <label>Tag</label>
                <input type="text" value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} placeholder="Ex: Edição Especial" />
              </div>
              <div className="cms-form-group">
                <label>Título *</label>
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nome da maratona" />
              </div>
              <div className="cms-form-group">
                <label>Descrição</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Descreva o evento..." />
              </div>
              <div className="cms-form-group">
                <label>URL da Imagem</label>
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
                {form.image_url && <img src={form.image_url} alt="Preview" className="cms-img-preview-small" style={{ marginTop: '8px' }} />}
              </div>

              {/* Upload de Múltiplas Imagens pro Banner */}
              <div className="cms-form-group" style={{ background: '#f8f9ff', padding: '15px', borderRadius: '10px', border: '1.5px solid #e0e7ff' }}>
                <label style={{ fontWeight: '700', marginBottom: '12px', display: 'block' }}>
                  🎠 Imagens do Carrossel de Banner
                </label>

                {/* Grid de imagens */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '14px' }}>
                  {normalizeBannerImages(form.banner_images).map((img, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      background: img.is_featured ? '#fffbeb' : 'white',
                      border: img.is_featured ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '10px',
                      transition: 'all 0.2s'
                    }}>
                      {/* Miniatura */}
                      <div style={{ position: 'relative', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{
                          width: '110px', height: '82px', borderRadius: '8px', overflow: 'hidden',
                          border: img.is_featured ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                          background: '#f3f4f6', position: 'relative'
                        }}>
                          <img
                            src={img.url}
                            alt={`Banner ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onError={e => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='82'%3E%3Crect width='110' height='82' fill='%23f3f4f6'/%3E%3Ctext x='55' y='32' text-anchor='middle' font-size='20'%3E%F0%9F%96%BC%EF%B8%8F%3C/text%3E%3Ctext x='55' y='52' text-anchor='middle' fill='%239ca3af' font-size='9' font-family='sans-serif'%3ESem preview%3C/text%3E%3Ctext x='55' y='66' text-anchor='middle' fill='%23c4b5fd' font-size='8' font-family='sans-serif'%3E(rede indispon%C3%ADvel)%3C/text%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                        {/* Link para abrir a imagem em nova aba */}
                        <a
                          href={img.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.65rem', color: '#6366f1', textDecoration: 'underline', fontWeight: '600' }}
                        >
                          🔗 Abrir
                        </a>
                        {img.is_featured && (
                          <span style={{
                            position: 'absolute', top: '-8px', left: '-8px',
                            background: '#f59e0b', borderRadius: '50%', width: '22px', height: '22px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', zIndex: 1
                          }}>⭐</span>
                        )}
                      </div>

                      {/* Controles */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Linha 1: label + toggle destaque + remover */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>Imagem {idx + 1}</span>
                          <button
                            onClick={() => toggleFeatured(idx)}
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              border: 'none',
                              cursor: 'pointer',
                              background: img.is_featured ? '#f59e0b' : '#e5e7eb',
                              color: img.is_featured ? 'white' : '#555',
                              transition: 'all 0.2s'
                            }}
                          >
                            {img.is_featured ? '⭐ Destaque Ativo' : '☆ Marcar como Destaque'}
                          </button>
                          <button
                            onClick={() => removeBannerImage(idx)}
                            style={{ marginLeft: 'auto', background: 'none', border: '1px solid #fca5a5', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', color: '#ef4444', fontSize: '0.75rem' }}
                          >
                            <X size={11} /> Remover
                          </button>
                        </div>

                        {/* Linha 2: datas de destaque (só aparece se for destaque) */}
                        {img.is_featured && (
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', background: '#fef3c7', borderRadius: '6px', padding: '8px 10px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e' }}>📅 Período de destaque:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.72rem', color: '#78350f' }}>De:</span>
                              <input
                                type="date"
                                value={img.featured_from || ''}
                                onChange={e => updateFeaturedDate(idx, 'featured_from', e.target.value)}
                                style={{ fontSize: '0.75rem', border: '1px solid #d97706', borderRadius: '5px', padding: '3px 6px', background: 'white' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.72rem', color: '#78350f' }}>Até:</span>
                              <input
                                type="date"
                                value={img.featured_until || ''}
                                onChange={e => updateFeaturedDate(idx, 'featured_until', e.target.value)}
                                style={{ fontSize: '0.75rem', border: '1px solid #d97706', borderRadius: '5px', padding: '3px 6px', background: 'white' }}
                              />
                            </div>
                            {(!img.featured_from && !img.featured_until) && (
                              <span style={{ fontSize: '0.7rem', color: '#b45309', fontStyle: 'italic' }}>Sem datas = sempre em destaque</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão de adicionar */}
                <label
                  htmlFor="banner-multi-upload"
                  style={{ cursor: 'pointer', background: '#6366f1', color: 'white', borderRadius: '8px', padding: '8px 16px', fontSize: '0.82rem', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ImageIcon size={14} /> {formUploading ? 'Enviando...' : '+ Adicionar Imagem ao Banner'}
                </label>
                <input
                  id="banner-multi-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handleBannerImageUpload(e.target.files[0])}
                />
              </div>
              <div className="cms-form-group">
                <label>Texto do Botão</label>
                <input type="text" value={form.cta_text} onChange={e => setForm({ ...form, cta_text: e.target.value })} />
              </div>
              <div className="cms-form-group">
                <label>Link do Botão</label>
                <input type="text" value={form.cta_url} onChange={e => setForm({ ...form, cta_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="cms-form-group cms-toggle-row">
                <label>Visível no Site</label>
                <button type="button" onClick={() => setForm({ ...form, visible: !form.visible })}
                  className={`cms-toggle ${form.visible ? 'on' : 'off'}`}>
                  {form.visible ? 'Sim' : 'Não'}
                </button>
              </div>
              <div className="cms-form-group">
                <label>Status da Maratona</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                  <option value="andamento">Em Andamento</option>
                  <option value="finalizada">Finalizada</option>
                </select>
              </div>
            </div>
            <div className="cms-modal-footer">
              <button onClick={() => setShowForm(false)} className="cms-btn-cancel">Cancelar</button>
              <button onClick={saveMaratona} disabled={saving || !form.title.trim()} className="cms-btn-save">
                {saving ? <RefreshCw size={14} className="fa-spin" /> : <Save size={14} />}
                {editId ? 'Salvar Alterações' : 'Criar Maratona'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
