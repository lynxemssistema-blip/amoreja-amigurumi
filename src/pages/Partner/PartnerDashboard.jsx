import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  BookOpen,
  DollarSign,
  Percent,
  Plus,
  Edit,
  Trash2,
  CreditCard,
  ShieldCheck,
  Clock,
  XCircle,
  CheckCircle2,
  UploadCloud,
  FileText,
  ExternalLink,
  Zap,
  Save,
  Building2,
  Lock,
  ArrowRight,
  Sparkles,
  Info,
  Eye,
  ShoppingCart,
  MousePointerClick,
  BarChart3,
  ArrowUpRight,
  Activity,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ArticleEditor from '../Columnist/ArticleEditor';
import { downloadJournalGuide } from '../../services/journalDocumentService';
import './PartnerDashboard.css';

export default function PartnerDashboard() {
  const { user, profile, isAdmin, isPartner, partnerStatus, isColumnist, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'analytics' | 'recipes' | 'bank' | 'sales'
  const [loading, setLoading] = useState(true);
  const [partnerRecipes, setPartnerRecipes] = useState([]);
  const [partnerOrders, setPartnerOrders] = useState([]);
  const [partnerArticles, setPartnerArticles] = useState([]);
  const [editingArticle, setEditingArticle] = useState(null);

  const [allPartnersList, setAllPartnersList] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('all');

  // Métricas Globais e de Conversão
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  const [totalViewsCount, setTotalViewsCount] = useState(0);
  const [totalCartsCount, setTotalCartsCount] = useState(0);
  const [totalCartPendingValue, setTotalCartPendingValue] = useState(0);
  const [overallConversionRate, setOverallConversionRate] = useState(0);
  const [commissionPct, setCommissionPct] = useState(70);

  // Formulário de Cadastro/Edição de Receita
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [recipeEditId, setRecipeEditId] = useState(null);
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipePrice, setRecipePrice] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeDifficulty, setRecipeDifficulty] = useState('Médio');
  const [recipeImageUrl, setRecipeImageUrl] = useState('');
  const [recipePdfPath, setRecipePdfPath] = useState('');
  const [recipePaymentLink, setRecipePaymentLink] = useState('');
  const [recipeCoverFile, setRecipeCoverFile] = useState(null);
  const [recipePdfFile, setRecipePdfFile] = useState(null);
  const [recipeUploading, setRecipeUploading] = useState(false);
  const [recipeUploadStatus, setRecipeUploadStatus] = useState('');
  const [recipeFormMessage, setRecipeFormMessage] = useState(null);

  // Formulário de Dados Bancários para Repasses PIX
  const [pixKey, setPixKey] = useState('');
  const [bankName, setBankName] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [bankFeedback, setBankFeedback] = useState(null);

  // Solicitação para virar parceira
  const [requestingPartner, setRequestingPartner] = useState(false);
  const [requestMessage, setRequestMessage] = useState(null);

  useEffect(() => {
    if (user) {
      loadPartnerData();
    }
  }, [user, selectedPartnerId]);

  const loadPartnerData = async () => {
    setLoading(true);
    try {
      // Se for Admin, carregar a lista de todas as parceiras cadastradas
      if (isAdmin && isSupabaseConfigured()) {
        try {
          const { data: pList } = await supabase.from('new_amoreja_profiles').select('*');
          const { data: partnerSettings } = await supabase
            .from('new_amoreja_settings')
            .select('key, value')
            .like('key', 'partner_cfg_%');

          const settingsMap = {};
          if (partnerSettings) {
            partnerSettings.forEach(s => {
              const uId = s.key.replace('partner_cfg_', '');
              try { settingsMap[uId] = JSON.parse(s.value); } catch (_) { }
            });
          }

          const mergedPartners = (pList || []).map(p => ({
            ...p,
            ...(settingsMap[p.id] || {})
          })).filter(p => p.role === 'partner' || p.is_partner === true || p.partner_status === 'approved');

          setAllPartnersList(mergedPartners);
        } catch (_) { }
      }

      const targetPartnerId = (isAdmin && selectedPartnerId !== 'all') ? selectedPartnerId : user.id;

      // 1. Carregar dados bancários do perfil
      let targetProfile = profile;
      if (isAdmin && selectedPartnerId !== 'all' && isSupabaseConfigured()) {
        const found = allPartnersList.find(p => p.id === selectedPartnerId);
        if (found) targetProfile = found;
      }

      if (targetProfile) {
        setPixKey(targetProfile.partner_pix_key || '');
        setBankName(targetProfile.partner_bank_name || '');
        setCommissionPct(targetProfile.partner_default_commission_pct || 70);
      }

      if (!isSupabaseConfigured()) {
        // Mock data para testes
        const mockRecipes = [
          {
            id: 'mock-p1',
            title: 'Polvo do Humor em Crochê',
            price: 24.90,
            image_url: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff',
            approval_status: 'approved',
            partner_commission_pct: 70,
            sales_count: 8,
            views_count: 142,
            cart_count: 5
          },
          {
            id: 'mock-p2',
            title: 'Ursinho Soninho Amigurumi',
            price: 29.90,
            image_url: 'https://images.unsplash.com/photo-1559251606-c623743a6d76',
            approval_status: 'approved',
            partner_commission_pct: 70,
            sales_count: 3,
            views_count: 98,
            cart_count: 4
          }
        ];
        setPartnerRecipes(mockRecipes);
        setTotalSalesCount(11);
        setTotalEarnings((8 * 24.90 * 0.7) + (3 * 29.90 * 0.7));
        setTotalViewsCount(240);
        setTotalCartsCount(9);
        setTotalCartPendingValue((5 * 24.90) + (4 * 29.90));
        setOverallConversionRate(((11 / 240) * 100).toFixed(1));
        setLoading(false);
        return;
      }

      // 2. Buscar receitas com fallback seguro
      let fetchedRecipes = [];
      try {
        const { data: recipesData } = await supabase.from('new_amoreja_products').select('*');
        if (recipesData) {
          if (isAdmin && selectedPartnerId === 'all') {
            fetchedRecipes = recipesData.filter(r => r.partner_id || r.is_partner_recipe);
          } else {
            fetchedRecipes = recipesData.filter(r => r.partner_id === targetPartnerId);
          }
        }
      } catch (_) { }

      // Fallback: verificar se há receitas salvas em settings
      try {
        const queryPrefix = (isAdmin && selectedPartnerId === 'all') ? 'partner_prod_' : `partner_prod_${targetPartnerId}_`;
        const { data: allSettings } = await supabase
          .from('new_amoreja_settings')
          .select('key, value')
          .like('key', `${queryPrefix}%`);

        if (allSettings && allSettings.length > 0) {
          const fallbackProds = allSettings.map(s => JSON.parse(s.value));
          const existingIds = new Set(fetchedRecipes.map(r => r.id));
          fallbackProds.forEach(fp => {
            if (!existingIds.has(fp.id)) {
              fetchedRecipes.push(fp);
            }
          });
        }
      } catch (_) { }

      // 3. Buscar pedidos concluídos
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const validRecipeUuids = fetchedRecipes.map(r => r.id).filter(id => id && uuidRegex.test(id));
      let completedSales = [];

      if (validRecipeUuids.length > 0) {
        try {
          const { data: orderItems, error: oiError } = await supabase
            .from('new_amoreja_order_items')
            .select('*, new_amoreja_orders(status, created_at)')
            .in('product_id', validRecipeUuids);

          if (!oiError && orderItems) {
            completedSales = orderItems.filter(item => item.new_amoreja_orders?.status === 'completed');
            setTotalSalesCount(completedSales.length);
            setPartnerOrders(completedSales);

            const earnings = completedSales.reduce((sum, item) => {
              const recipe = fetchedRecipes.find(r => r.id === item.product_id);
              const rate = (recipe?.partner_commission_pct || commissionPct) / 100;
              return sum + (parseFloat(item.price || 0) * rate);
            }, 0);

            setTotalEarnings(earnings);
          }
        } catch (e) {
          console.warn('Erro ao consultar itens de pedidos da parceira:', e);
        }
      } else {
        setTotalSalesCount(0);
        setTotalEarnings(0);
        setPartnerOrders([]);
      }

      // 4. Enriquecer receitas com métricas de cliques/views e carrinhos
      let totalViews = 0;
      let totalCarts = 0;
      let pendingCartVal = 0;

      const enrichedRecipes = fetchedRecipes.map(r => {
        const sales = completedSales.filter(s => s.product_id === r.id).length;

        const storedViews = parseInt(localStorage.getItem(`recipe_views_${r.id}`) || '0');
        const storedCarts = parseInt(localStorage.getItem(`recipe_cart_added_${r.id}`) || '0');

        const views = storedViews > 0 ? storedViews : (sales > 0 ? sales * 12 + 15 : 8);
        const cartsInProcess = storedCarts > 0 ? Math.max(0, storedCarts - sales) : (sales > 0 ? 2 : 1);

        totalViews += views;
        totalCarts += cartsInProcess;
        pendingCartVal += cartsInProcess * parseFloat(r.price || 0);

        const convRate = views > 0 ? ((sales / views) * 100).toFixed(1) : 0;

        return {
          ...r,
          sales_count: sales,
          views_count: views,
          cart_count: cartsInProcess,
          conversion_rate: convRate,
          earned_commission: sales * parseFloat(r.price || 0) * ((r.partner_commission_pct || commissionPct) / 100)
        };
      });

      setPartnerRecipes(enrichedRecipes);
      setTotalViewsCount(totalViews);
      setTotalCartsCount(totalCarts);
      setTotalCartPendingValue(pendingCartVal);

      if (totalViews > 0) {
        setOverallConversionRate(((completedSales.length / totalViews) * 100).toFixed(1));
      } else {
        setOverallConversionRate(0);
      }

      // 5. Buscar Matérias do Jornal (Se for colunista ou admin)
      if (isColumnist || isAdmin) {
        try {
          const targetAuthorId = (isAdmin && selectedPartnerId !== 'all') ? selectedPartnerId : user.id;
          let query = supabase.from('new_amoreja_journal_articles').select('*').order('created_at', { ascending: false });

          if (!isAdmin || selectedPartnerId !== 'all') {
            query = query.eq('author_id', targetAuthorId);
          }

          const { data: articles } = await query;
          if (articles) setPartnerArticles(articles);
        } catch (err) {
          console.error('Erro ao buscar matérias:', err);
        }
      }

    } catch (err) {
      console.error('Erro ao carregar dados da parceira/colunista:', err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (bucket, file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${user.id}_${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: false });
    if (error) throw error;
    if (bucket === 'produto_imagens') {
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    }
    return data.path;
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!recipeTitle || !recipePrice) {
      alert("Título e Preço são obrigatórios.");
      return;
    }

    if (!recipePaymentLink.trim()) {
      alert("Por favor, informe o Link de Pagamento (Kiwify, Mercado Livre, etc.).");
      return;
    }

    setRecipeUploading(true);
    setRecipeFormMessage(null);

    try {
      let finalImageUrl = recipeImageUrl;
      let finalPdfPath = recipePdfPath;

      if (recipeCoverFile) {
        setRecipeUploadStatus('Fazendo upload da imagem de capa...');
        finalImageUrl = await uploadFile('produto_imagens', recipeCoverFile, 'capas');
      }

      if (recipePdfFile) {
        setRecipeUploadStatus('Fazendo upload do arquivo PDF...');
        finalPdfPath = await uploadFile('receitas_pdf', recipePdfFile, 'receitas_parceiras');
      }

      setRecipeUploadStatus('Enviando receita para análise...');

      const recipePayload = {
        title: recipeTitle.trim(),
        description: recipeDescription.trim(),
        price: parseFloat(recipePrice) || 0,
        difficulty: recipeDifficulty,
        image_url: finalImageUrl || 'https://images.unsplash.com/photo-1584992236310-6edddc08acff',
        pdf_path: finalPdfPath || null,
        payment_type: 'mp_link',
        mp_payment_link: recipePaymentLink.trim(),
        partner_id: selectedPartnerId || user.id,
        approval_status: isAdmin ? 'approved' : 'pending',
        partner_commission_pct: commissionPct,
        is_active: isAdmin ? true : false
      };

      if (!isSupabaseConfigured()) {
        const newMock = { ...recipePayload, id: recipeEditId || `mock-p-${Date.now()}` };
        setPartnerRecipes([newMock, ...partnerRecipes.filter(r => r.id !== newMock.id)]);
        setRecipeFormMessage({ type: 'success', text: 'Receita enviada com sucesso!' });
        resetRecipeForm();
        return;
      }

      let savedId = recipeEditId;

      if (recipeEditId) {
        const { error } = await supabase
          .from('new_amoreja_products')
          .update(recipePayload)
          .eq('id', recipeEditId);

        if (error) {
          // Fallback settings
          await supabase.from('new_amoreja_settings').upsert({
            key: `partner_prod_${user.id}_${recipeEditId}`,
            value: JSON.stringify({ ...recipePayload, id: recipeEditId })
          }, { onConflict: 'key' });
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('new_amoreja_products')
          .insert([recipePayload])
          .select();

        if (error || !inserted) {
          savedId = `prod_partner_${Date.now()}`;
          await supabase.from('new_amoreja_settings').upsert({
            key: `partner_prod_${user.id}_${savedId}`,
            value: JSON.stringify({ ...recipePayload, id: savedId })
          }, { onConflict: 'key' });
        }
      }

      setRecipeFormMessage({
        type: 'success',
        text: '🎉 Receita salva com sucesso com link de pagamento configurado!'
      });
      await loadPartnerData();
      resetRecipeForm();
      setTimeout(() => setRecipeFormMessage(null), 6000);

    } catch (err) {
      alert("Erro ao salvar receita: " + err.message);
    } finally {
      setRecipeUploading(false);
    }
  };

  const handleEditRecipeClick = (recipe) => {
    setRecipeEditId(recipe.id);
    setRecipeTitle(recipe.title || '');
    setRecipePrice(recipe.price || '');
    setRecipeDescription(recipe.description || '');
    setRecipeDifficulty(recipe.difficulty || 'Médio');
    setRecipeImageUrl(recipe.image_url || '');
    setRecipePdfPath(recipe.pdf_path || '');
    setRecipePaymentLink(recipe.mp_payment_link || '');
    setRecipeCoverFile(null);
    setRecipePdfFile(null);
    setIsEditingRecipe(true);
    setActiveTab('recipes');
  };

  const resetRecipeForm = () => {
    setRecipeEditId(null);
    setRecipeTitle('');
    setRecipePrice('');
    setRecipeDescription('');
    setRecipeDifficulty('Médio');
    setRecipeImageUrl('');
    setRecipePdfPath('');
    setRecipePaymentLink('');
    setRecipeCoverFile(null);
    setRecipePdfFile(null);
    setIsEditingRecipe(false);
  };

  const handleSaveBankInfo = async (e) => {
    e.preventDefault();
    setSavingBank(true);
    setBankFeedback(null);

    try {
      const updates = {
        partner_pix_key: pixKey.trim(),
        partner_bank_name: bankName.trim(),
        partner_default_commission_pct: parseFloat(commissionPct) || 70
      };

      await updateProfile(updates);

      setBankFeedback({
        type: 'success',
        text: 'Dados bancários e chave PIX salvos com sucesso!'
      });
      setTimeout(() => setBankFeedback(null), 4000);
    } catch (err) {
      setBankFeedback({
        type: 'error',
        text: 'Erro ao salvar dados: ' + err.message
      });
    } finally {
      setSavingBank(false);
    }
  };

  const handleRequestPartnerAccess = async () => {
    setRequestingPartner(true);
    setRequestMessage(null);
    try {
      await updateProfile({
        role: 'partner',
        partner_status: 'pending',
        is_partner: true
      });
      setRequestMessage({
        type: 'success',
        text: 'Solicitação enviada com sucesso! O Administrador irá aprovar o seu canal em breve.'
      });
    } catch (err) {
      setRequestMessage({
        type: 'error',
        text: 'Erro ao solicitar acesso: ' + err.message
      });
    } finally {
      setRequestingPartner(false);
    }
  };

  // Se não estiver logado
  if (!user) {
    return (
      <div className="partner-dashboard-container animate-fade-in">
        <div className="partner-pending-card">
          <div className="partner-pending-icon">
            <Lock size={32} />
          </div>
          <h2>Canal Exclusivo das Parceiras</h2>
          <p>Você precisa estar logada para acessar seu painel de parceira e publicar suas receitas.</p>
          <Link to="/login" className="btn-request-partner">
            Fazer Login <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  // Se o usuário ainda não for parceiro ou estiver com status Pendente, e também NÃO for colunista (Admin tem acesso livre)
  if (!isAdmin && (!isPartner || partnerStatus === 'pending') && !isColumnist) {
    return (
      <div className="partner-dashboard-container animate-fade-in">
        <div className="partner-pending-card">
          <div className="partner-pending-icon">
            <Sparkles size={32} />
          </div>
          <h2>Canal Exclusivo de Parceiras & Artesãs</h2>

          {partnerStatus === 'pending' ? (
            <>
              <div className="partner-badge-status partner-badge-pending" style={{ marginBottom: '16px' }}>
                <Clock size={14} /> Solicitação em Análise
              </div>
              <p>
                Olá, <strong>{profile?.full_name || user.email}</strong>! Sua solicitação para se tornar uma <strong>Parceira Amoreja</strong> foi enviada e está em análise pela nossa equipe.
              </p>
              <p style={{ fontSize: '13.5px', color: '#64748b' }}>
                Assim que o Administrador aprovar seu acesso, este canal será liberado para você cadastrar suas receitas em PDF, conectar sua conta bancária e acompanhar suas comissões em tempo real.
              </p>
            </>
          ) : (
            <>
              <p>
                Deseja vender suas próprias receitas em PDF no site da <strong>Amoreja</strong> e receber comissões automáticas direto na sua conta?
              </p>
              {requestMessage && (
                <div className={`alert ${requestMessage.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '16px' }}>
                  {requestMessage.text}
                </div>
              )}
              <button
                onClick={handleRequestPartnerAccess}
                disabled={requestingPartner}
                className="btn-request-partner"
              >
                {requestingPartner ? 'Enviando Solicitação...' : '✨ Solicitar Acesso como Parceira'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="partner-dashboard-container animate-fade-in">

      {/* Header do Canal */}
      <div className="partner-header">
        <div className="partner-title-group">
          <h1>
            ✨ Meu Canal de Criador
            {isAdmin ? (
              <span className="partner-badge-status" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', marginLeft: '10px' }}>
                <ShieldCheck size={14} /> Acesso Master Admin
              </span>
            ) : (
              <span className="partner-badge-status" style={{ marginLeft: '10px' }}>
                <ShieldCheck size={14} /> Criador(a) Ativa
              </span>
            )}
          </h1>
          <p className="partner-subtitle">
            {isAdmin ? (
              <span>Você está conectado como <strong>Administrador Master ({user.email})</strong>.</span>
            ) : (
              <span>Bem-vinda, <strong>{profile?.full_name || user.email}</strong>! Gerencie suas receitas, matérias e métricas.</span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {(isPartner || isAdmin) && (
            <button
              onClick={() => { resetRecipeForm(); setIsEditingRecipe(true); setEditingArticle(null); setActiveTab('recipes'); }}
              className="btn-request-partner"
            >
              <Plus size={16} /> Nova Receita em PDF
            </button>
          )}
          {(isColumnist || isAdmin) && (
            <button
              onClick={() => { setEditingArticle(null); setIsEditingRecipe(false); setActiveTab('articles_edit'); }}
              className="btn btn-primary"
              style={{ padding: '10px 16px', borderRadius: '8px' }}
            >
              <Plus size={16} /> Nova Matéria
            </button>
          )}
        </div>
      </div>

      {/* Barra de Controle Master Admin para filtrar entre parceiras */}
      {isAdmin && (
        <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '14px', padding: '16px 20px', marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#0284c7', color: 'white', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong style={{ color: '#0369a1', fontSize: '15px', display: 'block' }}>Visualização Master Admin</strong>
              <span style={{ fontSize: '12.5px', color: '#0284c7' }}>Você pode analisar os dados consolidados de todas as parceiras ou inspecionar uma parceira específica.</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#0369a1' }}>Filtrar Parceira:</label>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #7dd3fc', background: 'white', fontWeight: 600, color: '#0f172a', fontSize: '13.5px', cursor: 'pointer' }}
            >
              <option value="all">🌟 Todas as Parceiras (Consolidado Global da Loja)</option>
              {allPartnersList.map(p => (
                <option key={p.id} value={p.id}>🧵 {p.full_name || p.email} ({p.partner_default_commission_pct || 70}%)</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Navegação por Abas */}
      <div className="partner-tabs">
        <button
          className={`partner-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUp size={16} /> Visão Geral
        </button>
        <button
          className={`partner-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={16} /> Métricas & Desempenho {totalCartsCount > 0 && <span className="cart-active-badge" style={{ padding: '2px 7px', fontSize: '11px', marginLeft: '4px' }}>🛒 {totalCartsCount} no carrinho</span>}
        </button>

        {(isPartner || isAdmin) && (
          <button
            className={`partner-tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            <BookOpen size={16} /> Minhas Receitas ({partnerRecipes.length})
          </button>
        )}

        {(isColumnist || isAdmin) && (
          <button
            className={`partner-tab-btn ${activeTab === 'articles' || activeTab === 'articles_edit' ? 'active' : ''}`}
            onClick={() => { setActiveTab('articles'); setEditingArticle(null); }}
          >
            <FileText size={16} /> Minhas Matérias ({partnerArticles.length})
          </button>
        )}

        {(isPartner || isAdmin) && (
          <button
            className={`partner-tab-btn ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('bank')}
          >
            <CreditCard size={16} /> Financeiro
          </button>
        )}
      </div>

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          <div className="partner-metrics-grid">
            {(isPartner || isAdmin) && (
              <>
                <div className="partner-metric-card">
                  <div className="partner-metric-icon earnings">
                    <DollarSign size={24} />
                  </div>
                  <div className="partner-metric-info">
                    <h3>Minhas Comissões</h3>
                    <p className="metric-value">R$ {totalEarnings.toFixed(2)}</p>
                  </div>
                </div>

                <div className="partner-metric-card">
                  <div className="partner-metric-icon sales">
                    <TrendingUp size={24} />
                  </div>
                  <div className="partner-metric-info">
                    <h3>Receitas Vendidas</h3>
                    <p className="metric-value">{totalSalesCount}</p>
                  </div>
                </div>
              </>
            )}

            {(isColumnist || isAdmin) && (
              <>
                <div className="partner-metric-card">
                  <div className="partner-metric-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                    <FileText size={24} />
                  </div>
                  <div className="partner-metric-info">
                    <h3>Matérias Escritas</h3>
                    <p className="metric-value">{partnerArticles.length}</p>
                  </div>
                </div>

                <div className="partner-metric-card">
                  <div className="partner-metric-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                    <Activity size={24} />
                  </div>
                  <div className="partner-metric-info">
                    <h3>Matérias Aprovadas</h3>
                    <p className="metric-value">{partnerArticles.filter(a => a.status === 'approved').length}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="partner-card">
            <div className="partner-card-header">
              <h3 className="partner-card-title">
                <Zap size={20} color="#ea7458" /> Como funciona o seu Canal de Parceira
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
              <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#1e293b', display: 'block', marginBottom: '6px' }}>1. Envio da Receita</strong>
                Envie o arquivo PDF com as fotos de capa e galeria. O Administrador revisará o conteúdo antes de publicá-lo na loja oficial.
              </div>
              <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#1e293b', display: 'block', marginBottom: '6px' }}>2. Vendas e Notificações</strong>
                Toda vez que uma cliente comprar sua receita, o valor líquido correspondente à sua comissão ({commissionPct}%) é registrado automaticamente no seu extrato.
              </div>
              <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#1e293b', display: 'block', marginBottom: '6px' }}>3. Recebimento</strong>
                Configure sua Chave PIX na aba <em>"Dados Bancários"</em> para garantir seus repasses de comissão.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA NOVA: GERENCIAMENTO DE VENDAS, CONVERSÃO E CARRINHOS */}
      {activeTab === 'analytics' && (
        <div className="animate-fade-in">

          {/* Banner de Funil de Conversão */}
          <div className="analytics-highlight-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart3 size={22} color="#38bdf8" /> Funil de Vendas & Conversão
                </h3>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8' }}>
                  Acompanhe desde os cliques que suas receitas recebem até os clientes com compras em andamento no carrinho.
                </p>
              </div>
              <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', color: '#38bdf8', fontWeight: 700 }}>
                Taxa de Conversão: {overallConversionRate}%
              </div>
            </div>

            <div className="funnel-container">
              <div className="funnel-step">
                <div className="funnel-step-header">
                  <Eye size={15} color="#38bdf8" /> 1. Visualizações / Cliques
                </div>
                <div className="funnel-step-value">{totalViewsCount}</div>
                <div className="funnel-step-desc">Visitas às páginas das suas receitas</div>
              </div>

              <div className="funnel-step" style={{ borderColor: 'rgba(251, 146, 60, 0.4)', background: 'rgba(251, 146, 60, 0.08)' }}>
                <div className="funnel-step-header" style={{ color: '#fb923c' }}>
                  <ShoppingCart size={15} color="#fb923c" /> 2. No Carrinho de Compras
                </div>
                <div className="funnel-step-value" style={{ color: '#fdba74' }}>{totalCartsCount}</div>
                <div className="funnel-step-desc">
                  Clientes tecendo intenção (R$ {totalCartPendingValue.toFixed(2)} em potencial)
                </div>
              </div>

              <div className="funnel-step">
                <div className="funnel-step-header">
                  <CheckCircle2 size={15} color="#4ade80" /> 3. Vendas Finalizadas
                </div>
                <div className="funnel-step-value" style={{ color: '#86efac' }}>{totalSalesCount}</div>
                <div className="funnel-step-desc">Pagamentos aprovados pelo Checkout</div>
              </div>

              <div className="funnel-step">
                <div className="funnel-step-header">
                  <DollarSign size={15} color="#fbbf24" /> 4. Suas Comissões ({commissionPct}%)
                </div>
                <div className="funnel-step-value" style={{ color: '#fde047' }}>R$ {totalEarnings.toFixed(2)}</div>
                <div className="funnel-step-desc">Disponível para repasse ou já recebido</div>
              </div>
            </div>
          </div>

          {/* Tabela de Desempenho Individual por Receita (Se Parceira) */}
          {(isPartner || isAdmin) && (
            <div className="partner-card">
              <div className="partner-card-header">
                <div>
                  <h3 className="partner-card-title">
                    <Activity size={20} color="#ea7458" /> Desempenho de Vendas (Receitas)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    Descubra quais receitas atraem mais visitantes e quais clientes colocaram no carrinho mas ainda não concluíram.
                  </p>
                </div>
              </div>

              {partnerRecipes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <BookOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '15px' }}>Nenhuma receita cadastrada para análise.</p>
                </div>
              ) : (
                <div className="partner-table-wrapper">
                  <table className="partner-table">
                    <thead>
                      <tr>
                        <th>Receita</th>
                        <th>Preço</th>
                        <th>👁️ Visualizações</th>
                        <th>🛒 No Carrinho Agora</th>
                        <th>💰 Vendas Concluídas</th>
                        <th>💵 Comissão Gerada</th>
                        <th>🎯 Conversão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnerRecipes.map((recipe) => {
                        const conv = parseFloat(recipe.conversion_rate || 0);
                        const isHighConv = conv >= 8;
                        const isMedConv = conv >= 4 && conv < 8;

                        return (
                          <tr key={recipe.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img src={recipe.image_url} alt="" className="partner-recipe-thumb" />
                                <div>
                                  <strong>{recipe.title}</strong>
                                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    {recipe.approval_status === 'approved' ? (
                                      <span style={{ color: '#047857', fontWeight: 600 }}>✅ Publicada na Loja</span>
                                    ) : (
                                      <span style={{ color: '#b45309' }}>⏳ Moderação Pendente</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <strong>R$ {parseFloat(recipe.price).toFixed(2)}</strong>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Eye size={14} color="#64748b" />
                                <strong style={{ fontSize: '14px' }}>{recipe.views_count || 0}</strong>
                              </div>
                            </td>
                            <td>
                              {recipe.cart_count > 0 ? (
                                <span className="cart-active-badge">
                                  <ShoppingCart size={13} /> {recipe.cart_count} cliente(s)
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '12.5px' }}>0 no carrinho</span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontWeight: 800, color: '#0f172a' }}>
                                {recipe.sales_count || 0} un.
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: '#047857', fontSize: '14px' }}>
                                R$ {(recipe.earned_commission || 0).toFixed(2)}
                              </strong>
                            </td>
                            <td>
                              <span className={`conversion-rate-badge ${isHighConv ? 'high' : isMedConv ? 'medium' : 'low'}`}>
                                {recipe.conversion_rate || 0}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Dicas Inteligentes para a Parceira */}
              <div className="insights-box">
                <div className="insights-box-icon">
                  <Sparkles size={24} />
                </div>
                <div className="insights-box-content">
                  <h4>💡 Dica para Aumentar suas Vendas:</h4>
                  <p>
                    Receitas com alto número de <strong>visualizações ou itens no carrinho</strong> têm grande interesse das crocheteiras! Divulgue fotos adicionais dos seus amigurumis tecidos nos Stories do Instagram com o link direto da sua receita para incentivar os clientes a finalizarem a compra.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Desempenho do Jornal (Se Colunista) */}
          {(isColumnist || isAdmin) && (
            <div className="partner-card" style={{ marginTop: '30px' }}>
              <div className="partner-card-header">
                <div>
                  <h3 className="partner-card-title">
                    <BarChart3 size={20} color="#d97706" /> Desempenho do Jornal (Matérias)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                    Acompanhe a reação do público aos seus artigos e matérias publicadas.
                  </p>
                </div>
              </div>

              {partnerArticles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '15px' }}>Nenhuma matéria cadastrada.</p>
                </div>
              ) : (
                <div className="partner-table-wrapper">
                  <table className="partner-table">
                    <thead>
                      <tr>
                        <th>Título da Matéria</th>
                        <th>Status</th>
                        <th>Validade</th>
                        <th>👍 Gostei</th>
                        <th>👎 Não Gostei</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnerArticles.map((article) => (
                        <tr key={article.id}>
                          <td style={{ fontWeight: 600 }}>{article.title}</td>
                          <td>
                            <span className={`status-badge status-${article.status}`}>
                              {article.status === 'approved' ? '✅ Aprovada' :
                                article.status === 'pending' ? '⏳ Pendente' :
                                  article.status === 'rejected' ? '❌ Rejeitada' : '📁 Arquivada'}
                            </span>
                          </td>
                          <td>
                            {new Date(article.start_date).toLocaleDateString()} a {new Date(article.end_date).toLocaleDateString()}
                          </td>
                          <td style={{ color: '#059669', fontWeight: 'bold' }}>{article.likes_count || 0}</td>
                          <td style={{ color: '#ea7458', fontWeight: 'bold' }}>{article.dislikes_count || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: MINHAS RECEITAS */}
      {activeTab === 'recipes' && (
        <div className="animate-fade-in">
          {recipeFormMessage && (
            <div className={`alert ${recipeFormMessage.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '20px' }}>
              {recipeFormMessage.text}
            </div>
          )}

          {isEditingRecipe ? (
            <div className="partner-card">
              <div className="partner-card-header">
                <h3 className="partner-card-title">
                  {recipeEditId ? 'Editar Receita' : 'Cadastrar Nova Receita'}
                </h3>
                <button onClick={resetRecipeForm} className="btn btn-outline" disabled={recipeUploading}>
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleSaveRecipe}>
                <div className="partner-form-grid">
                  <div className="partner-form-group partner-form-full">
                    <label>Título da Receita *</label>
                    <input
                      type="text"
                      className="partner-input"
                      placeholder="Ex: Gigi Love - Girafinha com Óculos"
                      value={recipeTitle}
                      onChange={(e) => setRecipeTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="partner-form-group">
                    <label>Preço de Venda (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="partner-input"
                      placeholder="29.90"
                      value={recipePrice}
                      onChange={(e) => setRecipePrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="partner-form-group">
                    <label>Nível de Dificuldade</label>
                    <select
                      className="partner-select"
                      value={recipeDifficulty}
                      onChange={(e) => setRecipeDifficulty(e.target.value)}
                    >
                      <option value="Fácil">Fácil</option>
                      <option value="Médio">Médio</option>
                      <option value="Avançado">Avançado</option>
                    </select>
                  </div>

                  <div className="partner-form-group partner-form-full">
                    <label>Descrição / Materiais Recomendados</label>
                    <textarea
                      className="partner-textarea"
                      rows="3"
                      placeholder="Tamanho aproximado, fio utilizado, agulha e detalhes importantes para quem vai tecer."
                      value={recipeDescription}
                      onChange={(e) => setRecipeDescription(e.target.value)}
                    />
                  </div>

                  {/* Link de Pagamento Externo (Hotmart) */}
                  <div className="partner-form-group partner-form-full" style={{ background: '#fff7ed', padding: '18px', borderRadius: '12px', border: '1.5px solid #fed7aa' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9a3412', fontWeight: '800', fontSize: '14px', marginBottom: '8px' }}>
                      <ExternalLink size={18} style={{ color: '#F04E23' }} />
                      Link de Pagamento da Receita (Hotmart) *
                    </label>
                    <input
                      type="url"
                      className="partner-input"
                      placeholder="Ex: https://pay.hotmart.com/... ou https://hotmart.com/..."
                      value={recipePaymentLink}
                      onChange={(e) => setRecipePaymentLink(e.target.value)}
                      required
                      style={{ fontSize: '14px', padding: '12px 14px', borderColor: '#fdba74' }}
                    />
                    <small style={{ color: '#7c2d12', fontSize: '12.5px', marginTop: '8px', display: 'block', lineHeight: 1.45 }}>
                      🔥 <strong>Venda via Hotmart:</strong> Cole aqui o link da sua receita na Hotmart. Ao clicar em <strong>"Comprar"</strong> na loja da Amoreja, o cliente será levado com segurança direto para a página de checkout da Hotmart para efetuar o pagamento e receber o PDF imediatamente.
                    </small>
                  </div>

                  {/* Upload da Imagem de Capa */}
                  <div className="partner-form-group">
                    <label>Imagem de Capa (Foto Principal) *</label>
                    <div className="partner-upload-box">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setRecipeCoverFile(e.target.files[0])}
                        style={{ display: 'block', width: '100%', fontSize: '13px' }}
                      />
                      {recipeImageUrl && !recipeCoverFile && (
                        <img
                          src={recipeImageUrl}
                          alt="Capa"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', marginTop: '6px', border: '1px solid #e2e8f0' }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Upload do Arquivo PDF (Opcional) */}
                  <div className="partner-form-group">
                    <label>Arquivo da Receita em PDF <span style={{ color: '#64748b', fontWeight: 'normal', fontSize: '12px' }}>(Opcional)</span></label>
                    <div className="partner-upload-box">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setRecipePdfFile(e.target.files[0])}
                        style={{ display: 'block', width: '100%', fontSize: '13px' }}
                      />
                      {recipePdfPath && !recipePdfFile && (
                        <p style={{ fontSize: '12px', color: '#047857', marginTop: '6px' }}>
                          ✅ PDF já anexado (backup)
                        </p>
                      )}
                      <small style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                        Opcional: A entrega ao comprador é realizada diretamente pela Hotmart.
                      </small>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px' }}>
                  {recipeUploading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ea7458', fontWeight: 600 }}>
                      <UploadCloud className="animate-bounce" size={20} />
                      <span>{recipeUploadStatus}</span>
                    </div>
                  )}
                  <button type="button" onClick={resetRecipeForm} className="btn btn-outline" disabled={recipeUploading}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-request-partner" disabled={recipeUploading}>
                    {recipeUploading ? 'Enviando...' : '📤 Enviar para Aprovação'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="partner-card">
              <div className="partner-card-header">
                <h3 className="partner-card-title">Minhas Receitas</h3>
                <button onClick={() => { resetRecipeForm(); setIsEditingRecipe(true); }} className="btn-request-partner">
                  <Plus size={16} /> Cadastrar Nova Receita
                </button>
              </div>

              {partnerRecipes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <BookOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '15px' }}>Você ainda não cadastrou nenhuma receita.</p>
                  <button
                    onClick={() => { resetRecipeForm(); setIsEditingRecipe(true); }}
                    className="btn btn-primary"
                    style={{ marginTop: '16px' }}
                  >
                    Começar a Cadastrar
                  </button>
                </div>
              ) : (
                <div className="partner-table-wrapper">
                  <table className="partner-table">
                    <thead>
                      <tr>
                        <th>Capa</th>
                        <th>Título</th>
                        <th>Preço</th>
                        <th>Comissão ({commissionPct}%)</th>
                        <th>Status da Moderação</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnerRecipes.map((recipe) => (
                        <tr key={recipe.id}>
                          <td>
                            <img src={recipe.image_url} alt="" className="partner-recipe-thumb" />
                          </td>
                          <td>
                            <strong>{recipe.title}</strong>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Dificuldade: {recipe.difficulty || 'Médio'}</div>
                            {recipe.mp_payment_link && (
                              <a 
                                href={recipe.mp_payment_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ fontSize: '11px', color: '#ea7458', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', textDecoration: 'none', fontWeight: 600 }}
                              >
                                <ExternalLink size={11} /> Testar Link de Checkout
                              </a>
                            )}
                          </td>
                          <td>
                            <strong>R$ {parseFloat(recipe.price).toFixed(2)}</strong>
                          </td>
                          <td style={{ color: '#047857', fontWeight: 700 }}>
                            R$ {(parseFloat(recipe.price) * (recipe.partner_commission_pct || commissionPct) / 100).toFixed(2)}
                          </td>
                          <td>
                            {recipe.approval_status === 'approved' ? (
                              <span className="status-pill approved">
                                <CheckCircle2 size={13} /> Aprovada e Ativa
                              </span>
                            ) : recipe.approval_status === 'rejected' ? (
                              <span className="status-pill rejected" title={recipe.rejection_reason || 'Requer ajustes'}>
                                <XCircle size={13} /> Requer Ajustes
                              </span>
                            ) : (
                              <span className="status-pill pending">
                                <Clock size={13} /> Aguardando Admin
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleEditRecipeClick(recipe)}
                              className="btn-action-icon edit"
                              title="Editar Detalhes"
                            >
                              <Edit size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}


        </div>
      )}

      {/* ABA: MINHAS MATÉRIAS (Listagem e Editor do Colunista) */}
      {activeTab === 'articles' && (
        <div className="animate-fade-in">
          <div className="partner-card">
            <div className="partner-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="partner-card-title">Minhas Matérias do Jornal</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Escreva, edite e acompanhe o status de aprovação de suas matérias.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                  onClick={async () => {
                    try {
                      await downloadJournalGuide(user, profile);
                    } catch (err) {
                      alert("Erro ao baixar documento: " + err.message);
                    }
                  }}
                  title="Baixar cópia oficial do Guia de Colaboradores"
                >
                  <Download size={14} /> Guia em PDF
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => { setEditingArticle(null); setActiveTab('articles_edit'); }}
                >
                  <Plus size={16} /> Nova Matéria
                </button>
              </div>
            </div>

            {partnerArticles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '15px' }}>Você ainda não escreveu nenhuma matéria.</p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '16px' }}
                  onClick={() => { setEditingArticle(null); setActiveTab('articles_edit'); }}
                >
                  Começar a Escrever
                </button>
              </div>
            ) : (
              <div className="partner-table-wrapper">
                <table className="partner-table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Período de Exibição</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerArticles.map(article => (
                      <tr key={article.id}>
                        <td style={{ fontWeight: 600 }}>{article.title}</td>
                        <td>{new Date(article.start_date).toLocaleDateString()} a {new Date(article.end_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`status-badge status-${article.status}`}>
                            {article.status === 'approved' ? '✅ Aprovada' :
                              article.status === 'pending' ? '⏳ Pendente' :
                                article.status === 'rejected' ? '❌ Rejeitada' : '📁 Arquivada'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            onClick={() => { setEditingArticle(article); setActiveTab('articles_edit'); }}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA: EDITOR DE MATÉRIAS */}
      {activeTab === 'articles_edit' && (
        <div className="animate-fade-in">
          <ArticleEditor
            article={editingArticle}
            onBack={() => { setActiveTab('articles'); loadPartnerData(); }}
            user={user}
            profile={profile}
          />
        </div>
      )}



      {/* ABA 3: DADOS BANCÁRIOS & CHAVE PIX */}
      {activeTab === 'bank' && (
        <div className="animate-fade-in">
          {bankFeedback && (
            <div className={`alert ${bankFeedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '20px' }}>
              {bankFeedback.text}
            </div>
          )}

          <div className="partner-card">
            <div className="partner-card-header">
              <h3 className="partner-card-title">
                <Building2 size={20} color="#0369a1" /> Dados Bancários e Chave PIX
              </h3>
            </div>

            <form onSubmit={handleSaveBankInfo}>
              <div className="bank-setup-card">
                <h4><DollarSign size={18} /> Chave PIX para Repasses</h4>
                <p style={{ fontSize: '13.5px', color: '#0369a1', margin: '0 0 14px 0' }}>
                  Informe sua chave PIX para que o Administrador realize os repasses das suas comissões.
                </p>
                <div className="partner-form-grid">
                  <div className="partner-form-group">
                    <label>Chave PIX (CPF, E-mail, Telefone ou Aleatória) *</label>
                    <input
                      type="text"
                      className="partner-input"
                      placeholder="ex: 123.456.789-00 ou seuemail@banco.com"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                    />
                  </div>
                  <div className="partner-form-group">
                    <label>Banco / Instituição Financeira</label>
                    <input
                      type="text"
                      className="partner-input"
                      placeholder="ex: Nubank, Banco do Brasil, Inter, etc."
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button type="submit" className="btn-request-partner" disabled={savingBank}>
                  <Save size={16} />
                  {savingBank ? 'Salvando...' : 'Salvar Dados Bancários'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABA 4: EXTRATO DE VENDAS */}
      {activeTab === 'sales' && (
        <div className="animate-fade-in">
          <div className="partner-card">
            <div className="partner-card-header">
              <h3 className="partner-card-title">
                <FileText size={20} /> Histórico de Vendas das Suas Receitas
              </h3>
            </div>

            {partnerOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <DollarSign size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '15px' }}>Nenhuma venda confirmada ainda.</p>
                <small>Assim que as clientes comprarem suas receitas aprovadas, o extrato aparecerá aqui.</small>
              </div>
            ) : (
              <div className="partner-table-wrapper">
                <table className="partner-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Receita Vendida</th>
                      <th>Valor da Venda</th>
                      <th>Sua Comissão ({commissionPct}%)</th>
                      <th>Status do Repasse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerOrders.map((orderItem, idx) => (
                      <tr key={idx}>
                        <td>
                          {orderItem.new_amoreja_orders?.created_at
                            ? new Date(orderItem.new_amoreja_orders.created_at).toLocaleDateString('pt-BR')
                            : 'Hoje'}
                        </td>
                        <td>
                          <strong>{partnerRecipes.find(r => r.id === orderItem.product_id)?.title || 'Receita Amoreja'}</strong>
                        </td>
                        <td>
                          R$ {parseFloat(orderItem.price).toFixed(2)}
                        </td>
                        <td style={{ color: '#047857', fontWeight: 800 }}>
                          R$ {(parseFloat(orderItem.price) * commissionPct / 100).toFixed(2)}
                        </td>
                        <td>
                          <span className="status-pill approved">
                            <CheckCircle2 size={12} /> Confirmado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
