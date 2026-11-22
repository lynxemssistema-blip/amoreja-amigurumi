import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { 
  Plus, 
  Edit, 
  Trash, 
  Check, 
  X, 
  BookOpen, 
  UploadCloud, 
  CreditCard, 
  Zap, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  Info,
  ShieldCheck,
  Star,
  Flame
} from 'lucide-react';
import { getPaymentPlatformInfo } from '../../utils/paymentPlatform';
import './ManageProducts.css';

const INITIAL_MOCK = [
  {
    id: '1',
    title: 'Gigi Love - Girafinha com Óculos',
    description: 'Receita completa para criar a Gigi Love, a girafinha elegante com óculos escuros de coração. Inclui tutorial detalhado passo a passo.',
    price: 29.90,
    image_url: 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=600&auto=format&fit=crop&q=80',
    difficulty: 'Médio',
    pdf_path: 'receitas/gigi_love.pdf',
    gallery_images: [],
    payment_type: 'automatic',
    mp_payment_link: '',
    is_featured: true
  }
];

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [maratonas, setMaratonas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de formulário
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [difficulty, setDifficulty] = useState('Médio');
  const [isActive, setIsActive] = useState(true);
  const [isFree, setIsFree] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [maratonaId, setMaratonaId] = useState('');
  
  // Link de Pagamento / Checkout Hotmart
  const [paymentType, setPaymentType] = useState('mp_link');
  const [mpPaymentLink, setMpPaymentLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Arquivos originais (urls ou paths)
  const [imageUrl, setImageUrl] = useState('');
  const [pdfPath, setPdfPath] = useState('');
  const [existingGallery, setExistingGallery] = useState([]);
  
  // Uploads
  const [coverFile, setCoverFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const [message, setMessage] = useState('');

  // Parceiras
  const [partnersList, setPartnersList] = useState([]);
  const [partnerId, setPartnerId] = useState('');
  const [partnerCommissionPct, setPartnerCommissionPct] = useState(70);
  const [approvalStatus, setApprovalStatus] = useState('approved');
  const [filterPartnerTab, setFilterPartnerTab] = useState('all'); // 'all' | 'amoreja' | 'partner' | 'pending'

  const handleApproveRecipe = async (recipe, approve = true) => {
    const newStatus = approve ? 'approved' : 'rejected';
    const newActive = approve;

    if (!isSupabaseConfigured()) {
      setProducts(products.map(p => p.id === recipe.id ? { ...p, approval_status: newStatus, is_active: newActive } : p));
      alert(approve ? "Receita da parceira APROVADA e publicada na loja!" : "Receita marcada como REPROVADA.");
      return;
    }

    try {
      const updates = { approval_status: newStatus, is_active: newActive };
      
      const { error } = await supabase
        .from('new_amoreja_products')
        .update(updates)
        .eq('id', recipe.id);

      if (error) {
        // Fallback settings
        await supabase.from('new_amoreja_settings').upsert({
          key: `partner_prod_${recipe.partner_id || 'p'}_${recipe.id}`,
          value: JSON.stringify({ ...recipe, ...updates })
        }, { onConflict: 'key' });
      }

      setMessage(approve ? `Receita "${recipe.title}" APROVADA e publicada na loja!` : `Receita "${recipe.title}" reprovada.`);
      await loadProducts();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      alert("Erro ao moderar receita: " + err.message);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      const stored = localStorage.getItem('demo_products');
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        setProducts(INITIAL_MOCK);
        localStorage.setItem('demo_products', JSON.stringify(INITIAL_MOCK));
      }
      setLoading(false);
      return;
    }

    try {
      // 1. Carregar lista de parceiras cadastradas
      try {
        const { data: partnersData } = await supabase
          .from('new_amoreja_profiles')
          .select('id, full_name, email, role, partner_default_commission_pct')
          .or('role.eq.partner,is_admin.eq.false');
        if (partnersData) setPartnersList(partnersData);
      } catch (_) {}

      // 2. Carregar produtos
      const { data: productsData, error: productsError } = await supabase
        .from('new_amoreja_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Buscar configurações de links adicionais do Mercado Pago caso não estejam na coluna direta
      const { data: settingsData } = await supabase
        .from('new_amoreja_settings')
        .select('key, value')
        .or('key.like.mp_prod_cfg_%,key.like.partner_prod_%');

      const settingsMap = {};
      const fallbackPartnerProds = [];

      if (settingsData) {
        settingsData.forEach(item => {
          try {
            if (item.key.startsWith('mp_prod_cfg_')) {
              const prodId = item.key.replace('mp_prod_cfg_', '');
              settingsMap[prodId] = JSON.parse(item.value);
            } else if (item.key.startsWith('partner_prod_')) {
              fallbackPartnerProds.push(JSON.parse(item.value));
            }
          } catch (e) {}
        });
      }

      let mergedProducts = (productsData || []).map(prod => {
        const fallbackCfg = settingsMap[prod.id];
        return {
          ...prod,
          payment_type: prod.payment_type || fallbackCfg?.payment_type || 'automatic',
          mp_payment_link: prod.mp_payment_link || fallbackCfg?.mp_payment_link || '',
          approval_status: prod.approval_status || 'approved',
          partner_commission_pct: prod.partner_commission_pct || 70
        };
      });

      // Merge fallback partner products if not in main table
      const existingIds = new Set(mergedProducts.map(p => p.id));
      fallbackPartnerProds.forEach(fp => {
        if (!existingIds.has(fp.id)) {
          mergedProducts.push({
            ...fp,
            payment_type: fp.payment_type || 'automatic',
            approval_status: fp.approval_status || 'pending',
            partner_commission_pct: fp.partner_commission_pct || 70
          });
        }
      });

      setProducts(mergedProducts);

      const { data: maratonasData, error: maratonasError } = await supabase
        .from('new_amoreja_maratonas')
        .select('id, title')
        .order('sort_order', { ascending: true });
        
      if (!maratonasError) {
        setMaratonas(maratonasData || []);
      }
    } catch (err) {
      console.error(err.message);
      setProducts(INITIAL_MOCK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleToggleFeatured = async (product) => {
    const nextVal = !product.is_featured;
    if (!isSupabaseConfigured()) {
      setProducts(products.map(p => p.id === product.id ? { ...p, is_featured: nextVal } : p));
      return;
    }
    try {
      const { error } = await supabase
        .from('new_amoreja_products')
        .update({ is_featured: nextVal })
        .eq('id', product.id);
      if (error) throw error;
      setProducts(products.map(p => p.id === product.id ? { ...p, is_featured: nextVal } : p));
      setMessage(nextVal ? `⭐ "${product.title}" adicionada aos Destaques da Home!` : `"${product.title}" removida dos Destaques.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert("Erro ao alterar destaque: " + err.message);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setDifficulty('Médio');
    setIsActive(true);
    setIsFree(false);
    setIsFeatured(false);
    setMaratonaId('');
    setPaymentType('mp_link');
    setMpPaymentLink('');
    setImageUrl('');
    setPdfPath('');
    setExistingGallery([]);
    setCoverFile(null);
    setPdfFile(null);
    setGalleryFiles([]);
    setPartnerId('');
    setPartnerCommissionPct(70);
    setApprovalStatus('approved');
    setIsEditing(false);
  };

  const handleEditClick = (product) => {
    setEditId(product.id);
    setTitle(product.title);
    setDescription(product.description || '');
    setPrice(product.price);
    setDifficulty(product.difficulty || 'Médio');
    setIsActive(product.is_active !== undefined ? product.is_active : true);
    setIsFree(product.is_free !== undefined ? product.is_free : false);
    setIsFeatured(product.is_featured !== undefined ? !!product.is_featured : false);
    setMaratonaId(product.maratona_id || '');
    setPaymentType(product.payment_type || 'automatic');
    setMpPaymentLink(product.mp_payment_link || '');
    setImageUrl(product.image_url);
    setPdfPath(product.pdf_path);
    setExistingGallery(product.gallery_images || []);
    setPartnerId(product.partner_id || '');
    setPartnerCommissionPct(product.partner_commission_pct || 70);
    setApprovalStatus(product.approval_status || 'approved');
    setCoverFile(null);
    setPdfFile(null);
    setGalleryFiles([]);
    setIsEditing(true);
  };

  const uploadFile = async (bucket, file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: false });
    
    if (error) throw error;
    
    if (bucket === 'produto_imagens') {
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    }
    
    return data.path; // For PDFs
  };

  const handleCopyLink = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!title || !price) {
      alert("Título e Preço são obrigatórios.");
      return;
    }

    let currentMpLink = mpPaymentLink.trim();
    
    // Se não tiver Supabase configurado (demo mode)
    if (!isSupabaseConfigured()) {
      alert("Modo de demonstração: Upload de arquivos requer conexão com banco de dados real.");
      resetForm();
      return;
    }

    setIsUploading(true);

    try {
      let finalImageUrl = imageUrl;
      let finalPdfPath = pdfPath;
      let finalGallery = [...existingGallery];

      if (coverFile) {
        setUploadStatus('Fazendo upload da Capa...');
        finalImageUrl = await uploadFile('produto_imagens', coverFile, 'capas');
      }

      if (pdfFile) {
        setUploadStatus('Fazendo upload do PDF...');
        finalPdfPath = await uploadFile('receitas_pdf', pdfFile, 'receitas');
      }

      if (galleryFiles.length > 0) {
        setUploadStatus('Fazendo upload da Galeria...');
        for (let i = 0; i < galleryFiles.length; i++) {
          const url = await uploadFile('produto_imagens', galleryFiles[i], 'galeria');
          finalGallery.push(url);
        }
      }

      setUploadStatus('Salvando receita...');

      const payload = {
        title,
        description,
        price: parseFloat(price) || 0,
        difficulty,
        is_active: isActive,
        is_free: isFree,
        is_featured: isFeatured,
        maratona_id: maratonaId || null,
        payment_type: paymentType,
        mp_payment_link: paymentType === 'mp_link' ? currentMpLink : null,
        partner_id: partnerId || null,
        partner_commission_pct: parseFloat(partnerCommissionPct) || 70,
        approval_status: approvalStatus || 'approved',
        image_url: finalImageUrl,
        pdf_path: finalPdfPath,
        gallery_images: finalGallery
      };

      let savedId = editId;

      if (editId) {
        const { error } = await supabase
          .from('new_amoreja_products')
          .update(payload)
          .eq('id', editId);
        
        if (error) {
          // Fallback se a coluna payment_type ainda não estiver criada no schema
          if (error.code === '42703' || error.message?.includes('payment_type')) {
            const sanitizedPayload = { ...payload };
            delete sanitizedPayload.payment_type;
            delete sanitizedPayload.mp_payment_link;
            
            const { error: retryError } = await supabase
              .from('new_amoreja_products')
              .update(sanitizedPayload)
              .eq('id', editId);
            if (retryError) throw retryError;

            // Salvar no new_amoreja_settings como fallback transparente
            await supabase.from('new_amoreja_settings').upsert({
              key: `mp_prod_cfg_${editId}`,
              value: JSON.stringify({ payment_type: paymentType, mp_payment_link: currentMpLink })
            }, { onConflict: 'key' });
          } else {
            throw error;
          }
        }
        setMessage('Receita atualizada com sucesso!');
      } else {
        const { data: insertedData, error } = await supabase
          .from('new_amoreja_products')
          .insert([payload])
          .select();
        
        if (error) {
          // Fallback se a coluna payment_type ainda não estiver criada no schema
          if (error.code === '42703' || error.message?.includes('payment_type')) {
            const sanitizedPayload = { ...payload };
            delete sanitizedPayload.payment_type;
            delete sanitizedPayload.mp_payment_link;
            
            const { data: retryData, error: retryError } = await supabase
              .from('new_amoreja_products')
              .insert([sanitizedPayload])
              .select();
            if (retryError) throw retryError;
            
            if (retryData && retryData[0]) {
              savedId = retryData[0].id;
              await supabase.from('new_amoreja_settings').upsert({
                key: `mp_prod_cfg_${savedId}`,
                value: JSON.stringify({ payment_type: paymentType, mp_payment_link: currentMpLink })
              }, { onConflict: 'key' });
            }
          } else {
            throw error;
          }
        }
        setMessage('Nova receita salva e publicada!');
      }
      loadProducts();
      resetForm();
    } catch (err) {
      alert("Erro ao salvar produto: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente deletar esta receita? (Isso não deletará os arquivos do Storage)")) return;

    if (!isSupabaseConfigured()) {
      const list = products.filter(p => p.id !== id);
      setProducts(list);
      return;
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        const { error } = await supabase
          .from('new_amoreja_products')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }

      // Limpar fallback se existir (configuração ou produtos parceiros salvos em settings)
      await supabase.from('new_amoreja_settings').delete().eq('key', `mp_prod_cfg_${id}`);
      await supabase.from('new_amoreja_settings').delete().like('key', `%${id}%`);

      setMessage('Receita excluída com sucesso!');
      loadProducts();
    } catch (err) {
      alert("Erro ao deletar: " + err.message);
    }
  };

  const removeGalleryImage = (indexToRemove) => {
    setExistingGallery(existingGallery.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="manage-products-container">
      <div className="admin-page-header">
        <div>
          <h2>Gerenciamento de Receitas</h2>
          <p className="admin-page-subtitle">Cadastre suas receitas e vincule o link de checkout seguro da Hotmart.</p>
        </div>
        {!isEditing && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setIsEditing(true)} className="btn btn-primary">
              <Plus size={16} /> Cadastrar Nova Receita
            </button>
          </div>
        )}
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      {isEditing ? (
        <div className="product-form-card">
          <div className="form-header">
            <div>
              <h3>{editId ? 'Editar Receita' : 'Nova Receita'}</h3>
              <p className="form-subtitle">Preencha os detalhes da receita e insira o link de pagamento da Hotmart.</p>
            </div>
            <button onClick={resetForm} className="btn-close-form" disabled={isUploading}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave} className="admin-form">
            <div className="form-grid">
              
              <div className="form-group col-span-2">
                <label className="form-label">Título da Receita *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Ex: Gigi Love - Girafinha"
                  disabled={isUploading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preço (R$) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-control" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  placeholder="Ex: 29.90"
                  disabled={isUploading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nível de Dificuldade</label>
                <select 
                  className="form-control" 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={isUploading}
                >
                  <option value="Fácil">Fácil</option>
                  <option value="Médio">Médio</option>
                  <option value="Avançado">Avançado</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Maratona Vinculada</label>
                <select 
                  className="form-control" 
                  value={maratonaId} 
                  onChange={(e) => setMaratonaId(e.target.value)}
                  disabled={isUploading}
                >
                  <option value="">Nenhuma maratona (Receita avulsa)</option>
                  {maratonas.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              {/* SEÇÃO DE AUTORIA E PARCEIRA */}
              <div className="form-group">
                <label className="form-label">Autoria / Parceira Autora</label>
                <select 
                  className="form-control" 
                  value={partnerId} 
                  onChange={(e) => {
                    setPartnerId(e.target.value);
                    const selected = partnersList.find(p => p.id === e.target.value);
                    if (selected?.partner_default_commission_pct) {
                      setPartnerCommissionPct(selected.partner_default_commission_pct);
                    }
                  }}
                  disabled={isUploading}
                >
                  <option value="">Amoreja Amigurumi (Própria / Oficial)</option>
                  {partnersList.map(p => (
                    <option key={p.id} value={p.id}>🧵 {p.full_name || p.email} (Parceira)</option>
                  ))}
                </select>
              </div>

              {partnerId && (
                <div className="form-group col-span-2" style={{ background: '#fff7ed', padding: '12px 16px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                  <label className="form-label" style={{ color: '#9a3412', fontWeight: 'bold' }}>
                    Percentual de Comissão da Parceira (%):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="number" 
                      min="1" 
                      max="100" 
                      className="form-control" 
                      style={{ width: '120px' }}
                      value={partnerCommissionPct} 
                      onChange={(e) => setPartnerCommissionPct(e.target.value)}
                      disabled={isUploading}
                    />
                    <span style={{ fontSize: '13.5px', color: '#c2410c' }}>
                      A parceira receberá <strong>{partnerCommissionPct}%</strong> e a Amoreja reterá <strong>{100 - (parseFloat(partnerCommissionPct) || 0)}%</strong> em cada venda.
                    </span>
                  </div>
                </div>
              )}

              {/* SEÇÃO: FORMA DE PAGAMENTO & CHECKOUT (HOTMART) */}
              <div className="form-group col-span-2 mp-integration-box">
                <div className="mp-box-header">
                  <div className="mp-box-title-group">
                    <div className="mp-icon-badge" style={{ background: '#fff1ec', color: '#F04E23' }}>
                      <Flame size={18} />
                    </div>
                    <div>
                      <h4 className="mp-box-title">Plataforma de Pagamento & Checkout (Hotmart)</h4>
                      <p className="mp-box-subtitle">Defina o link de checkout seguro da Hotmart onde o cliente efetuará o pagamento da receita.</p>
                    </div>
                  </div>
                </div>

                {/* Campo Hotmart Link */}
                <div className="mp-link-input-container" style={{ borderLeft: '4px solid #F04E23', marginTop: '10px' }}>
                  <div className="mp-link-header-row">
                    <label className="form-label" style={{ fontWeight: 'bold', margin: 0, color: '#9a3412', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Flame size={18} style={{ color: '#F04E23' }} />
                      Link de Pagamento / Checkout da Hotmart *
                    </label>
                  </div>

                  <div className="mp-input-action-group" style={{ marginTop: '10px' }}>
                    <input 
                      type="url" 
                      className="form-control mp-link-input"
                      placeholder="https://pay.hotmart.com/... ou https://hotmart.com/..."
                      value={mpPaymentLink}
                      onChange={(e) => setMpPaymentLink(e.target.value)}
                      disabled={isUploading}
                      style={{ borderColor: '#fed7aa', fontSize: '14px' }}
                      required={!isFree}
                    />
                    {mpPaymentLink && (
                      <>
                        <button 
                          type="button" 
                          className="btn-mp-action" 
                          title="Copiar Link"
                          onClick={() => handleCopyLink(mpPaymentLink)}
                        >
                          {copiedLink ? <Check size={16} color="#00a650" /> : <Copy size={16} />}
                        </button>
                        <a 
                          href={mpPaymentLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn-mp-action btn-mp-preview"
                          title="Testar Link em nova aba"
                          style={{ background: '#F04E23', borderColor: '#F04E23', color: '#fff' }}
                        >
                          <ExternalLink size={16} />
                          <span>Testar Hotmart</span>
                        </a>
                      </>
                    )}
                  </div>
                  <p className="mp-link-help" style={{ color: '#7c2d12', marginTop: '8px' }}>
                    <Info size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                    Cole o link oficial do produto gerado na Hotmart (ex: <code>https://pay.hotmart.com/...</code>). O Amoreja direcionará o comprador automaticamente para essa página ao clicar em comprar.
                  </p>
                </div>
              </div>

              {/* UPLOADS DE ARQUIVOS */}
              <div className="form-group col-span-2 files-upload-box">
                <h4 className="upload-box-title">Arquivos e Imagens da Receita</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {/* Arquivo PDF */}
                  <div>
                    <label className="form-label" style={{fontWeight: 'bold'}}>Arquivo PDF da Receita <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '12px' }}>(Opcional)</span></label>
                    {pdfPath && !pdfFile && <p style={{fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem'}}>Arquivo atual: {pdfPath.split('/').pop()}</p>}
                    <input 
                      type="file" 
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files[0])} 
                      className="form-control"
                      disabled={isUploading}
                    />
                  </div>

                  {/* Imagem de Capa */}
                  <div>
                    <label className="form-label" style={{fontWeight: 'bold'}}>2. Imagem de Capa (Mestre) *</label>
                    {imageUrl && !coverFile && <div className="mb-2"><img src={imageUrl} alt="Capa Atual" style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px'}}/></div>}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files[0])} 
                      className="form-control"
                      disabled={isUploading}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <label className="form-label" style={{fontWeight: 'bold'}}>3. Galeria (Carrossel)</label>
                  <p style={{fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem'}}>Selecione várias imagens para mostrar mais detalhes do Amigurumi.</p>
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    onChange={(e) => setGalleryFiles(Array.from(e.target.files))} 
                    className="form-control"
                    disabled={isUploading}
                  />
                  
                  {/* Miniaturas da Galeria Atual */}
                  {existingGallery.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {existingGallery.map((imgUrl, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={imgUrl} alt="Galeria" style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px'}}/>
                          <button 
                            type="button" 
                            onClick={() => removeGalleryImage(i)}
                            style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', padding: '2px', border: 'none', cursor: 'pointer' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group col-span-2 form-toggles-row">
                <label className="toggle-switch-label">
                  <input 
                    type="checkbox" 
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={isUploading}
                    className="toggle-checkbox"
                  />
                  <div className="toggle-slider"></div>
                  <span className="toggle-text">Receita Ativa (Visível na loja)</span>
                </label>

                <label className="toggle-switch-label">
                  <input 
                    type="checkbox" 
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    disabled={isUploading}
                    className="toggle-checkbox"
                  />
                  <div className="toggle-slider"></div>
                  <span className="toggle-text" style={{ fontWeight: isFeatured ? '700' : 'normal', color: isFeatured ? '#b45309' : 'inherit' }}>
                    ⭐ Destacar na Home (Carrossel)
                  </span>
                </label>

                <label className="toggle-switch-label">
                  <input 
                    type="checkbox" 
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    disabled={isUploading}
                    className="toggle-checkbox"
                  />
                  <div className="toggle-slider"></div>
                  <span className="toggle-text">Receita Grátis (R$ 0,00)</span>
                </label>
              </div>

              <div className="form-group col-span-2">
                <label className="form-label">Descrição / Detalhes da Receita</label>
                <textarea 
                  className="form-control" 
                  rows="4"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Conteúdo incluído, tamanho estimado e observações."
                  disabled={isUploading}
                ></textarea>
              </div>
            </div>

            <div className="form-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px' }}>
              {isUploading && (
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary-color)', gap: '8px' }}>
                  <UploadCloud className="animate-bounce" size={20} />
                  <span className="font-semibold">{uploadStatus}</span>
                </div>
              )}
              
              <button type="button" onClick={resetForm} className="btn btn-outline" disabled={isUploading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={isUploading}>
                {isUploading ? 'Salvando...' : <><Check size={16} /> Salvar Receita</>}
              </button>
            </div>
          </form>
        </div>
      ) : loading ? (
        <div className="admin-loading">
          <div className="loader"></div>
        </div>
      ) : products.length > 0 ? (
        <>
          {/* Filtros Rápidos de Autoria & Moderação */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setFilterPartnerTab('all')}
              className={`btn ${filterPartnerTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              Todas ({products.length})
            </button>
            <button 
              onClick={() => setFilterPartnerTab('featured')}
              className={`btn ${filterPartnerTab === 'featured' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 14px', fontSize: '13px', borderColor: '#f59e0b', color: filterPartnerTab === 'featured' ? 'white' : '#b45309' }}
            >
              ⭐ Destaques da Home ({products.filter(p => p.is_featured).length})
            </button>
            <button 
              onClick={() => setFilterPartnerTab('pending')}
              className={`btn ${filterPartnerTab === 'pending' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 14px', fontSize: '13px', borderColor: '#f59e0b', color: filterPartnerTab === 'pending' ? 'white' : '#b45309' }}
            >
              ⏳ Aguardando Aprovação ({products.filter(p => p.approval_status === 'pending').length})
            </button>
            <button 
              onClick={() => setFilterPartnerTab('partner')}
              className={`btn ${filterPartnerTab === 'partner' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 14px', fontSize: '13px', borderColor: '#ea7458' }}
            >
              🧵 Parceiras ({products.filter(p => p.partner_id).length})
            </button>
            <button 
              onClick={() => setFilterPartnerTab('amoreja')}
              className={`btn ${filterPartnerTab === 'amoreja' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              ✨ Amoreja Oficial ({products.filter(p => !p.partner_id).length})
            </button>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Capa</th>
                  <th>Título</th>
                  <th>Destaque (Home)</th>
                  <th>Autoria</th>
                  <th>Maratona</th>
                  <th>Forma de Venda</th>
                  <th>Moderação / Status</th>
                  <th>Preço / Tipo</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(product => {
                    if (filterPartnerTab === 'featured') return !!product.is_featured;
                    if (filterPartnerTab === 'pending') return product.approval_status === 'pending';
                    if (filterPartnerTab === 'partner') return !!product.partner_id;
                    if (filterPartnerTab === 'amoreja') return !product.partner_id;
                    return true;
                  })
                  .map((product) => (
                  <tr key={product.id}>
                    <td>
                      <img 
                        src={product.image_url} 
                        alt="" 
                        className="table-product-thumbnail" 
                      />
                    </td>
                    <td>
                      <strong>{product.title}</strong>
                      {product.pdf_path && (
                        <div className="table-pdf-tag">
                          <ShieldCheck size={12} color="#00a650" />
                          <span>PDF Vinculado</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(product)}
                        className={`btn-star-toggle ${product.is_featured ? 'active' : ''}`}
                        title={product.is_featured ? "Remover do carrossel da Home" : "Destacar no carrossel da Home"}
                      >
                        <Star size={14} fill={product.is_featured ? "#f59e0b" : "none"} color={product.is_featured ? "#f59e0b" : "#94a3b8"} />
                        <span>{product.is_featured ? "Destaque" : "Normal"}</span>
                      </button>
                    </td>
                    <td>
                      {product.partner_id ? (
                        <div>
                          <span className="badge" style={{ background: '#fff7ed', color: '#ea7458', fontWeight: 700 }}>
                            🧵 {partnersList.find(p => p.id === product.partner_id)?.full_name || 'Parceira'}
                          </span>
                          <div style={{ fontSize: '11px', color: '#9a3412', marginTop: '2px' }}>
                            Comissão: {product.partner_commission_pct || 70}%
                          </div>
                        </div>
                      ) : (
                        <span className="badge" style={{ background: '#f8fafc', color: '#475569' }}>
                          Amoreja Oficial
                        </span>
                      )}
                    </td>
                    <td>
                      {product.maratona_id ? (
                        <span className="badge" style={{background: '#e0f7fa', color: '#006064'}}>{maratonas.find(m => m.id === product.maratona_id)?.title || 'Desconhecida'}</span>
                      ) : (
                        <span className="text-muted" style={{fontSize: '0.8rem'}}>-</span>
                      )}
                    </td>
                    <td>
                      {product.is_free ? (
                        <span className="badge badge-free-tag">🎉 Grátis</span>
                      ) : product.mp_payment_link ? (
                        (() => {
                          const plat = getPaymentPlatformInfo(product.mp_payment_link);
                          return (
                            <div className="badge-mp-wrapper">
                              <span 
                                className="badge" 
                                style={{ background: plat.color, color: plat.textColor, fontWeight: 700 }}
                                title={product.mp_payment_link}
                              >
                                <ExternalLink size={12} /> {plat.badge}
                              </span>
                              <a 
                                href={product.mp_payment_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="table-link-preview-icon"
                                title={`Abrir checkout no ${plat.badge}`}
                              >
                                <ExternalLink size={13} />
                              </a>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="badge-mp-wrapper">
                          <span className="badge" style={{ background: '#fff1ec', color: '#F04E23', border: '1px solid #fed7aa', fontWeight: 600 }}>
                            <Flame size={12} /> Hotmart
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      {product.approval_status === 'pending' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 'bold' }}>
                            ⏳ Aguardando Aprovação
                          </span>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              onClick={() => handleApproveRecipe(product, true)}
                              className="btn btn-sm"
                              style={{ background: '#10b981', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                              title="Aprovar e Publicar na Loja"
                            >
                              ✅ Aprovar
                            </button>
                            <button 
                              onClick={() => handleApproveRecipe(product, false)}
                              className="btn btn-sm"
                              style={{ background: '#ef4444', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                              title="Rejeitar Receita"
                            >
                              ❌ Rejeitar
                            </button>
                          </div>
                        </div>
                      ) : product.approval_status === 'rejected' ? (
                        <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>❌ Rejeitada</span>
                      ) : product.is_active ? (
                        <span className="badge badge-medio">✅ Ativa na Loja</span>
                      ) : (
                        <span className="badge text-muted" style={{border: '1px solid #ddd'}}>Inativa</span>
                      )}
                    </td>
                    <td>
                      {product.is_free ? (
                        <strong style={{color: '#32BCAD'}}>Grátis</strong>
                      ) : (
                        `R$ ${parseFloat(product.price).toFixed(2)}`
                      )}
                    </td>
                    <td className="text-right">
                      <div className="actions-cell">
                        <button 
                          onClick={() => handleEditClick(product)} 
                          className="btn-action-icon edit" 
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)} 
                          className="btn-action-icon delete" 
                          title="Excluir"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="admin-empty-state">
          <BookOpen size={48} className="text-muted" />
          <p>Nenhuma receita cadastrada ainda.</p>
        </div>
      )}
    </div>
  );
}
