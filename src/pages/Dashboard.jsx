import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { getCachedData, setCachedData } from '../utils/dataCache';
import { Download, FileText, ShoppingBag, User, Camera, Save, ChevronRight, BookOpen, Star, PenTool, Flag } from 'lucide-react';
import './Dashboard.css';

// Mockup de pedidos comprados no Modo Demo
const MOCK_PURCHASES = [
  {
    id: 'p-1',
    created_at: '2026-07-01T15:30:00Z',
    status: 'completed',
    total_amount: 29.90,
    items: [
      {
        id: 'i-1',
        title: 'Gigi Love - Girafinha com Óculos',
        price: 29.90,
        pdf_path: 'receitas/gigi_love.pdf',
        image_url: 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=600&auto=format&fit=crop&q=80'
      }
    ]
  }
];

export default function Dashboard() {
  const { user, profile, isAdmin, isPartner, isColumnist, isMaratonista, isDemoMode, updateProfile } = useAuth();
  const navigate = useNavigate();
  const cachedOrders = getCachedData('dashboard_orders');
  const cachedCatalog = getCachedData('dashboard_catalog');
  const [orders, setOrders] = useState(cachedOrders || []);
  const [catalogRecipes, setCatalogRecipes] = useState(cachedCatalog || []);
  const [loading, setLoading] = useState(!cachedOrders && !cachedCatalog);
  const [activeTab, setActiveTab] = useState('receitas'); // 'receitas' ou 'perfil'
  const [adminViewMode, setAdminViewMode] = useState('catalog'); // 'personal' | 'catalog' | 'all_clients'

  // Perfil State
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    const fetchUserOrders = async () => {
      if (!cachedOrders && !cachedCatalog) {
        setLoading(true);
      }

      if (isDemoMode) {
        setOrders(MOCK_PURCHASES);
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Se Admin e modo catálogo ativado: carregar todas as receitas da plataforma
        if (isAdmin) {
          const { data: allProds } = await supabase
            .from('new_amoreja_products')
            .select('*')
            .order('created_at', { ascending: false });
          if (allProds) {
            setCatalogRecipes(allProds);
            setCachedData('dashboard_catalog', allProds);
          }
        }

        let query = supabase
          .from('new_amoreja_orders')
          .select(`
            id,
            created_at,
            status,
            total_amount,
            user_id,
            new_amoreja_order_items (
              price,
              new_amoreja_products (
                id,
                title,
                pdf_path,
                image_url
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (!isAdmin || adminViewMode === 'personal') {
          query = query.eq('user_id', user.id);
        }

        const { data: ordersData, error: ordersError } = await query;
        if (ordersError) throw ordersError;

        const formatted = (ordersData || []).map(order => ({
          id: order.id,
          created_at: order.created_at,
          status: order.status,
          total_amount: order.total_amount,
          items: (order.new_amoreja_order_items || []).map(item => ({
            id: item.new_amoreja_products?.id,
            title: item.new_amoreja_products?.title,
            price: item.price,
            pdf_path: item.new_amoreja_products?.pdf_path,
            image_url: item.new_amoreja_products?.image_url
          }))
        }));

        setOrders(formatted);
        setCachedData('dashboard_orders', formatted);
      } catch (err) {
        console.error("Erro ao carregar compras:", err.message);
        setOrders(MOCK_PURCHASES);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, [user, isAdmin, adminViewMode, isDemoMode]);

  const handleDownload = async (title, pdfPath) => {
    if (!isSupabaseConfigured() || !pdfPath) {
      alert(`Download indisponível ou arquivo não especificado.`);
      return;
    }

    if (pdfPath.startsWith('http://') || pdfPath.startsWith('https://') || pdfPath.startsWith('/')) {
      window.open(pdfPath, '_blank');
      return;
    }
    
    try {
      const { data, error } = await supabase.storage.from('receitas_pdf').createSignedUrl(pdfPath, 60 * 60);
      if (error) throw error;
      if (data && data.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Erro ao gerar link de download:', err.message);
      if (err.message?.includes('Object not found') || err.message?.includes('400')) {
        alert(`O arquivo PDF desta receita ("${title}") ainda não foi anexado no servidor.`);
      } else {
        alert('Erro ao tentar fazer o download do PDF: ' + err.message);
      }
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    
    // Atualiza o perfil sem recarregar a foto a menos que já esteja no estado
    const { error } = await updateProfile({
      full_name: fullName,
      avatar_url: avatarUrl
    });

    setSavingProfile(false);
    if (!error) {
      alert("Perfil atualizado com sucesso!");
    } else {
      alert("Erro ao atualizar o perfil. Tente novamente.");
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!isSupabaseConfigured() || isDemoMode) {
      alert("Upload de imagem indisponível no Modo Demo.");
      return;
    }

    // Validações básicas
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem não pode ter mais que 5MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      const newUrl = urlData.publicUrl;
      setAvatarUrl(newUrl);

      // Salva no perfil do banco
      const res = await updateProfile({ avatar_url: newUrl });
      if (res && res.error) throw res.error;
      alert("Foto de perfil atualizada com sucesso!");

    } catch (err) {
      console.error("Erro no upload do avatar:", err);
      alert("Erro ao enviar a imagem: " + (err.message || 'Tente novamente.'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading container">
        <div className="loader"></div>
        <p>Carregando seu portal...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page container section-padding animate-fade-in">
      <div className="dashboard-layout">
        
        {/* Menu Lateral do Cliente */}
        <aside className="dashboard-sidebar">
          <div className="dashboard-user-card">
            <div className="dashboard-avatar-wrapper" onClick={() => fileInputRef.current?.click()}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Seu Perfil" className="dashboard-avatar" />
              ) : (
                <div className="dashboard-avatar-placeholder">
                  {fullName ? fullName.charAt(0).toUpperCase() : <User size={32} />}
                </div>
              )}
              <div className="dashboard-avatar-overlay">
                <Camera size={20} />
              </div>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleAvatarChange} 
            />
            
            <h3 className="dashboard-user-name">{fullName || 'Cliente'}</h3>
            <p className="dashboard-user-email">{profile?.email}</p>
          </div>

          <nav className="dashboard-nav">
            <button 
              className={`dashboard-nav-item ${activeTab === 'receitas' ? 'active' : ''}`}
              onClick={() => setActiveTab('receitas')}
            >
              <BookOpen size={20} /> Minhas Receitas <ChevronRight size={16} className="arrow-icon" />
            </button>
            <button 
              className={`dashboard-nav-item ${activeTab === 'perfil' ? 'active' : ''}`}
              onClick={() => setActiveTab('perfil')}
            >
              <User size={20} /> Meu Perfil <ChevronRight size={16} className="arrow-icon" />
            </button>
            
            {(isPartner || isColumnist || isAdmin) && (
              <button 
                className="dashboard-nav-item"
                onClick={() => navigate('/meu-canal')}
                style={{ color: '#059669', marginTop: '10px' }}
              >
                <Star size={20} /> Meu Canal <ChevronRight size={16} className="arrow-icon" />
              </button>
            )}

            {(isMaratonista || isAdmin) && (
              <button 
                className="dashboard-nav-item"
                onClick={() => navigate('/maratonas')}
                style={{ color: '#0284c7' }}
              >
                <Flag size={20} /> Área da Maratonista <ChevronRight size={16} className="arrow-icon" />
              </button>
            )}
          </nav>
        </aside>

        {/* Área Principal */}
        <main className="dashboard-content">
          
          {/* Aba: Minhas Receitas */}
          {activeTab === 'receitas' && (
            <div className="dashboard-tab-content">
              <div className="dashboard-content-header">
                <h2>{isAdmin ? 'Minhas Receitas & Acesso Master' : 'Minhas Receitas'}</h2>
                <p>
                  {isAdmin 
                    ? 'Como Administrador Master, você tem acesso irrestrito a todos os PDFs da plataforma e compras dos clientes.'
                    : 'Todas as receitas que você comprou estarão disponíveis aqui para download.'}
                </p>
              </div>

              {/* Seletor Master Admin */}
              {isAdmin && (
                <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '14px 18px', marginBottom: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: '#0369a1', fontSize: '14px' }}>👑 Modo Master Admin:</strong>
                    <span style={{ fontSize: '13px', color: '#0284c7' }}>Escolha o que deseja visualizar no painel:</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setAdminViewMode('catalog')}
                      className={`btn ${adminViewMode === 'catalog' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '6px 12px', fontSize: '12.5px' }}
                    >
                      📚 Catálogo Completo ({catalogRecipes.length} Receitas)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminViewMode('all_clients')}
                      className={`btn ${adminViewMode === 'all_clients' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '6px 12px', fontSize: '12.5px' }}
                    >
                      🛒 Pedidos de Todos os Clientes ({orders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminViewMode('personal')}
                      className={`btn ${adminViewMode === 'personal' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '6px 12px', fontSize: '12.5px' }}
                    >
                      👤 Minhas Compras Pessoais
                    </button>
                  </div>
                </div>
              )}

              {isAdmin && adminViewMode === 'catalog' ? (
                /* Catálogo Completo de PDFs para o Admin baixar qualquer um */
                <div className="purchased-list">
                  <div className="order-block">
                    <div className="order-block-header" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                      <div>
                        <span className="order-id-label" style={{ color: '#047857' }}>Acesso Master Amoreja</span>
                        <span className="order-date" style={{ color: '#065f46' }}>Liberado para Administrador</span>
                      </div>
                      <div className="order-meta-info">
                        <span className="order-status-badge completed">Catálogo Completo Ativo</span>
                      </div>
                    </div>

                    <div className="order-items-grid">
                      {catalogRecipes.map((item) => (
                        <div key={item.id} className="purchased-item-card">
                          <img src={item.image_url} alt={item.title} className="purchased-item-img" />
                          <div className="purchased-item-info">
                            <h3 className="purchased-item-title">{item.title}</h3>
                            <p className="purchased-item-meta">
                              {item.partner_id ? '🧵 Receita de Parceira' : '✨ Amoreja Oficial'} • PDF Digital
                            </p>
                            
                            <button 
                              onClick={() => handleDownload(item.title, item.pdf_path)} 
                              className="btn btn-primary btn-download"
                              title="Testar e Baixar PDF"
                            >
                              <Download size={16} /> Baixar PDF da Receita
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : orders.length > 0 ? (
                <div className="purchased-list">
                  {orders.map((order) => (
                    <div key={order.id} className="order-block">
                      <div className="order-block-header">
                        <div>
                          <span className="order-id-label">Pedido: #{order.id.slice(0, 8)}</span>
                          <span className="order-date">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="order-meta-info">
                          <span className={`order-status-badge ${order.status}`}>
                            {order.status === 'completed' ? 'Aprovado' : order.status === 'pending' ? 'Pendente' : 'Cancelado'}
                          </span>
                          <span className="order-total">Total: R$ {parseFloat(order.total_amount).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="order-items-grid">
                        {order.items.map((item) => (
                          <div key={item.id} className="purchased-item-card">
                            <img src={item.image_url} alt={item.title} className="purchased-item-img" />
                            <div className="purchased-item-info">
                              <h3 className="purchased-item-title">{item.title}</h3>
                              <p className="purchased-item-meta">PDF Digital • Download Ilimitado</p>
                              
                              {order.status === 'completed' ? (
                                <button 
                                  onClick={() => handleDownload(item.title, item.pdf_path)} 
                                  className="btn btn-primary btn-download"
                                >
                                  <Download size={16} /> Baixar Receita (PDF)
                                </button>
                              ) : (
                                <div className="download-locked-message">
                                  Aguardando confirmação de pagamento para liberar o download.
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty">
                  <ShoppingBag size={48} className="empty-icon" />
                  <h3>Sua biblioteca está vazia!</h3>
                  <p>Você ainda não comprou nenhuma receita. Visite nossa loja para encontrar receitas incríveis.</p>
                  <Link to="/loja" className="btn btn-primary">
                    Ir para a Loja
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Aba: Meu Perfil */}
          {activeTab === 'perfil' && (
            <div className="dashboard-tab-content animate-fade-in">
              <div className="dashboard-content-header">
                <h2>Editar Perfil</h2>
                <p>Mantenha seus dados atualizados para garantirmos o melhor atendimento.</p>
              </div>

              <div className="profile-form-container">
                <form onSubmit={handleProfileSave} className="profile-form">
                  <div className="form-group">
                    <label>E-mail de Cadastro</label>
                    <input 
                      type="text" 
                      value={profile?.email || ''} 
                      disabled 
                      className="form-control bg-gray-50"
                      title="O E-mail não pode ser alterado"
                    />
                    <small className="form-help">Para mudar o e-mail, contate o suporte.</small>
                  </div>

                  <div className="form-group">
                    <label>Nome Completo</label>
                    <div className="input-with-icon">
                      <User size={18} className="input-icon" />
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Seu nome completo" 
                        className="form-control"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-actions mt-8">
                    <button 
                      type="submit" 
                      className="btn btn-primary btn-save-profile"
                      disabled={savingProfile || uploadingAvatar}
                    >
                      {savingProfile ? 'Salvando...' : <><Save size={18} /> Salvar Alterações</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
