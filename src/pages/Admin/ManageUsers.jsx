import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { Users, Search, Shield, ShieldOff, User as UserIcon, Eye, X, ShoppingBag } from 'lucide-react';
import './ManageUsers.css';

const INITIAL_MOCK_USERS = [
  { id: '1', full_name: 'Marcia Reggiani', email: 'admin@amoreja.com.br', is_admin: true, is_active: true, created_at: '2026-07-01T10:00:00Z', instagram_handle: '@amoreja', avatar_url: '' },
  { id: '2', full_name: 'Cliente Estudo', email: 'cliente@exemplo.com', is_admin: false, is_active: true, created_at: '2026-07-02T14:30:00Z', instagram_handle: '@cliente.croche', avatar_url: '' }
];

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detalhes do Usuário (Modal)
  const [selectedUser, setSelectedUser] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [filterRole, setFilterRole] = useState('all'); // 'all' | 'admin' | 'partner' | 'client'

  const loadUsers = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      setUsers(INITIAL_MOCK_USERS);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('new_amoreja_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let fetchedUsers = data || [];

      // Carregar configurações de parceira dos fallbacks se existirem
      try {
        const { data: partnerSettings } = await supabase
          .from('new_amoreja_settings')
          .select('key, value')
          .like('key', 'partner_cfg_%');
        
        if (partnerSettings && partnerSettings.length > 0) {
          const cfgMap = {};
          partnerSettings.forEach(s => {
            const uId = s.key.replace('partner_cfg_', '');
            cfgMap[uId] = JSON.parse(s.value);
          });
          fetchedUsers = fetchedUsers.map(u => ({
            ...u,
            ...(cfgMap[u.id] || {})
          }));
        }
      } catch (_) {}

      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setUsers(INITIAL_MOCK_USERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleApprovePartner = async (userId, approve = true) => {
    const newStatus = approve ? 'approved' : 'rejected';
    const newRole = approve ? 'partner' : 'client';

    if (!isSupabaseConfigured()) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole, partner_status: newStatus, is_partner: approve } : u));
      return;
    }

    try {
      const updates = { 
        role: newRole, 
        partner_status: newStatus,
        is_partner: approve,
        partner_default_commission_pct: 70
      };

      const { error } = await supabase
        .from('new_amoreja_profiles')
        .update(updates)
        .eq('id', userId);

      // Fallback em settings
      await supabase.from('new_amoreja_settings').upsert({
        key: `partner_cfg_${userId}`,
        value: JSON.stringify(updates)
      }, { onConflict: 'key' });

      setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
      alert(approve ? "Acesso de Parceira APROVADO com sucesso!" : "Solicitação de Parceira RECUSADA.");
    } catch (err) {
      alert("Erro ao atualizar status de parceira: " + err.message);
    }
  };

  const handleTogglePartner = async (userId, currentRole) => {
    const isCurrentlyPartner = currentRole === 'partner';
    if (isCurrentlyPartner) {
      if (!window.confirm("Deseja remover o perfil de Parceira deste usuário?")) return;
      await handleApprovePartner(userId, false);
    } else {
      if (!window.confirm("Deseja promover este usuário a PARCEIRA (Artesã Autora) com acesso ao canal exclusivo?")) return;
      await handleApprovePartner(userId, true);
    }
  };

  const toggleAdminStatus = async (userId, currentStatus) => {
    if (!isSupabaseConfigured()) {
      alert("Ação indisponível no Modo Demo.");
      return;
    }

    const newStatus = !currentStatus;
    
    // Confirmação para evitar promoções acidentais
    if (newStatus && !window.confirm("Tem certeza que deseja conceder acesso total de Administrador para este usuário?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('new_amoreja_profiles')
        .update({ is_admin: newStatus })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, is_admin: newStatus } : u));
    } catch (err) {
      alert("Erro ao alterar permissões: " + err.message);
    }
  };

  const handleToggleColumnist = async (userId, userTags) => {
    if (!isSupabaseConfigured()) {
      alert("Ação indisponível no Modo Demo.");
      return;
    }

    const currentTags = userTags || [];
    const isColumnist = currentTags.includes('colunista');
    
    let newTags;
    if (isColumnist) {
      if (!window.confirm("Deseja remover o perfil de Colunista deste usuário?")) return;
      newTags = currentTags.filter(t => t !== 'colunista');
    } else {
      if (!window.confirm("Deseja conceder acesso de COLUNISTA para este usuário? Ele poderá criar e publicar matérias no Jornal.")) return;
      newTags = [...currentTags, 'colunista'];
    }

    try {
      const { error } = await supabase
        .from('new_amoreja_profiles')
        .update({ user_tags: newTags })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => u.id === userId ? { ...u, user_tags: newTags } : u));
      alert(isColumnist ? "Perfil de Colunista removido." : "Usuário promovido a Colunista com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar status de colunista: " + err.message);
    }
  };

  const toggleUserActive = async (userId, currentActive) => {
    // Se is_active for undefined, assumimos que é true
    const isActive = currentActive !== false;
    const newActive = !isActive;

    if (!isSupabaseConfigured()) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: newActive } : u));
      return;
    }

    if (!newActive && !window.confirm("Tem certeza que deseja DESATIVAR o acesso deste usuário? Ele não conseguirá mais entrar na plataforma.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('new_amoreja_profiles')
        .update({ is_active: newActive })
        .eq('id', userId);

      if (error) {
        if (error.code === 'PGRST204' || error.message.includes('is_active')) {
          alert("Aviso: A coluna 'is_active' precisa ser adicionada ao seu banco de dados Supabase na tabela 'new_amoreja_profiles' para esta função operar.\n\nExecute no SQL Editor do Supabase:\nALTER TABLE public.new_amoreja_profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;");
        } else {
          throw error;
        }
      }

      setUsers(users.map(u => u.id === userId ? { ...u, is_active: newActive } : u));
    } catch (err) {
      alert("Erro ao alterar status: " + err.message);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("ATENÇÃO: Deseja EXCLUIR permanentemente o perfil deste usuário? Isso não apagará a conta dele no Auth, apenas o perfil e acessos no sistema.")) {
      return;
    }

    if (!isSupabaseConfigured()) {
      setUsers(users.filter(u => u.id !== userId));
      return;
    }

    try {
      const { error } = await supabase
        .from('new_amoreja_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      alert("Erro ao excluir usuário: " + err.message);
    }
  };


  const openUserModal = async (user) => {
    setSelectedUser(user);
    setLoadingStats(true);
    setUserOrders([]);

    if (!isSupabaseConfigured()) {
      // Mock stats
      setTimeout(() => {
        setUserOrders([{ id: 'mock-1', created_at: new Date().toISOString(), total_amount: 59.80, status: 'completed' }]);
        setLoadingStats(false);
      }, 500);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('new_amoreja_orders')
        .select('id, created_at, total_amount, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setUserOrders(data || []);
    } catch (err) {
      console.error("Erro ao buscar pedidos do usuário:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const closeUserModal = () => {
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.instagram_handle && user.instagram_handle.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterRole === 'admin') return user.is_admin;
    if (filterRole === 'partner') return user.role === 'partner' || user.is_partner || user.partner_status === 'pending';
    if (filterRole === 'client') return !user.is_admin && user.role !== 'partner' && !user.is_partner;

    return true;
  });

  return (
    <div className="manage-users-container">
      <div className="admin-page-header flex-col-sm">
        <div className="header-title">
          <h2>Usuários, Permissões e Parceiras</h2>
          <p className="admin-page-subtitle">Gerencie acessos de Administradores, Clientes e aprove novas Parceiras / Artesãs.</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por nome, email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {/* Filtros Rápidos por Papel */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setFilterRole('all')}
          className={`btn ${filterRole === 'all' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '6px 14px', fontSize: '13px' }}
        >
          Todos ({users.length})
        </button>
        <button 
          onClick={() => setFilterRole('partner')}
          className={`btn ${filterRole === 'partner' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '6px 14px', fontSize: '13px', borderColor: '#ea7458' }}
        >
          🧵 Parceiras & Artesãs ({users.filter(u => u.role === 'partner' || u.is_partner || u.partner_status === 'pending').length})
        </button>
        <button 
          onClick={() => setFilterRole('admin')}
          className={`btn ${filterRole === 'admin' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '6px 14px', fontSize: '13px' }}
        >
          🛡️ Administradores ({users.filter(u => u.is_admin).length})
        </button>
        <button 
          onClick={() => setFilterRole('client')}
          className={`btn ${filterRole === 'client' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '6px 14px', fontSize: '13px' }}
        >
          👤 Clientes ({users.filter(u => !u.is_admin && u.role !== 'partner' && !u.is_partner).length})
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="loader"></div>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="admin-table-wrapper users-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Contato</th>
                <th>Data de Cadastro</th>
                <th>Papel / Permissão</th>
                <th>Status Parceira</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className={user.is_admin ? 'admin-row' : ''}>
                  <td>
                    <div className="user-info-cell">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="user-avatar-small" />
                      ) : (
                        <div className="user-avatar-placeholder">
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon size={16} />}
                        </div>
                      )}
                      <div>
                        <strong>{user.full_name || 'Sem Nome'}</strong>
                        {user.is_admin && <span className="admin-badge-mini">Admin</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="user-contact-cell">
                      <span className="user-email">{user.email}</span>
                      {user.instagram_handle && (
                        <span className="user-instagram">{user.instagram_handle}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span className={`status-badge ${user.is_admin ? 'status-admin' : user.role === 'partner' || user.is_partner ? 'status-partner' : 'status-client'}`}>
                        {user.is_admin ? 'Administrador' : user.role === 'partner' || user.is_partner ? '🧵 Parceira' : 'Cliente'}
                      </span>
                      {user.is_active === false && (
                        <span className="status-badge" style={{ background: '#fee2e2', color: '#ef4444' }}>Desativado</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {(user.role === 'partner' || user.is_partner) ? (
                      user.partner_status === 'pending' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 'bold' }}>
                            ⏳ Aguardando Aprovação
                          </span>
                          <button 
                            onClick={() => handleApprovePartner(user.id, true)} 
                            className="btn btn-sm" 
                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                            title="Aprovar Acesso"
                          >
                            Aprovar
                          </button>
                        </div>
                      ) : user.partner_status === 'rejected' ? (
                        <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>Recusada</span>
                      ) : (
                        <span className="badge" style={{ background: '#ecfdf5', color: '#047857', fontWeight: 600 }}>
                          ✅ Ativa ({user.partner_default_commission_pct || 70}%)
                        </span>
                      )
                    ) : (
                      <span className="text-muted" style={{ fontSize: '12px' }}>Não solicitou</span>
                    )}
                  </td>
                  <td className="text-right actions-cell">
                    <button 
                      onClick={() => openUserModal(user)}
                      className="btn-view-user"
                      title="Ver Resumo de Compras e Dados"
                    >
                      <Eye size={16} /> Ver
                    </button>

                    <button 
                      onClick={() => handleTogglePartner(user.id, user.role)}
                      className={`btn-toggle-admin ${user.role === 'partner' || user.is_partner ? 'remove-admin' : 'make-admin'}`}
                      style={{ borderColor: '#ea7458', color: user.role === 'partner' || user.is_partner ? '#dc2626' : '#ea7458' }}
                      title={user.role === 'partner' || user.is_partner ? "Remover de Parceira" : "Tornar Parceira"}
                    >
                      {user.role === 'partner' || user.is_partner ? 'Remover Parceira' : '+ Tornar Parceira'}
                    </button>

                    <button 
                      onClick={() => handleToggleColumnist(user.id, user.user_tags)}
                      className={`btn-toggle-admin ${user.user_tags?.includes('colunista') ? 'remove-admin' : 'make-admin'}`}
                      style={{ borderColor: '#d97706', color: user.user_tags?.includes('colunista') ? '#b45309' : '#d97706' }}
                      title={user.user_tags?.includes('colunista') ? "Remover Colunista" : "Tornar Colunista"}
                    >
                      {user.user_tags?.includes('colunista') ? 'Remover Colunista' : '+ Tornar Colunista'}
                    </button>

                    <button 
                      onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                      className={`btn-toggle-admin ${user.is_admin ? 'remove-admin' : 'make-admin'}`}
                      title={user.is_admin ? "Remover acesso de Administrador" : "Conceder acesso de Administrador"}
                    >
                      {user.is_admin ? (
                        <><ShieldOff size={16} /> Rebaixar</>
                      ) : (
                        <><Shield size={16} /> Admin</>
                      )}
                    </button>

                    <div className="dropdown-actions" style={{ position: 'relative', display: 'inline-block', marginLeft: '6px' }}>
                      <button 
                        onClick={(e) => {
                          const menu = e.currentTarget.nextElementSibling;
                          menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                        }}
                        className="btn-more-options"
                        style={{ padding: '6px 10px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        title="Mais opções"
                      >
                        •••
                      </button>
                      <div className="dropdown-menu" style={{ display: 'none', position: 'absolute', right: 0, top: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, minWidth: '140px', overflow: 'hidden', marginTop: '4px' }}>
                        <button 
                          onClick={() => toggleUserActive(user.id, user.is_active)}
                          style={{ width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: user.is_active !== false ? '#ef4444' : '#10b981' }}
                        >
                          {user.is_active !== false ? 'Desativar Acesso' : 'Reativar Acesso'}
                        </button>
                        <button 
                          onClick={() => deleteUser(user.id)}
                          style={{ width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: '#fef2f2', cursor: 'pointer', color: '#dc2626', fontWeight: 'bold' }}
                        >
                          Excluir Perfil
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">
          <Users size={48} className="text-muted" />
          <p>Nenhum usuário encontrado com esse termo de busca.</p>
        </div>
      )}

      {/* Modal de Detalhes do Usuário */}
      {selectedUser && (
        <div className="user-modal-overlay" onClick={closeUserModal}>
          <div className="user-modal-content" onClick={e => e.stopPropagation()}>
            <div className="user-modal-header">
              <h3>Resumo: {selectedUser.full_name}</h3>
              <button onClick={closeUserModal} className="btn-close-modal"><X size={20} /></button>
            </div>
            <div className="user-modal-body">
              {loadingStats ? (
                <div style={{textAlign: 'center', padding: '2rem 0'}}>
                  <div className="loader" style={{display: 'inline-block'}}></div>
                  <p>Carregando histórico...</p>
                </div>
              ) : (
                <>
                  <div className="user-stats-grid">
                    <div className="stat-box">
                      <span className="stat-box-title">Total Gasto</span>
                      <span className="stat-box-value">R$ {userOrders.reduce((sum, o) => o.status === 'completed' ? sum + o.total_amount : sum, 0).toFixed(2)}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-box-title">Pedidos Totais</span>
                      <span className="stat-box-value">{userOrders.length}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-box-title">Contato</span>
                      <span className="text-sm font-bold block mt-2" style={{ wordBreak: 'break-all' }}>{selectedUser.instagram_handle || selectedUser.email}</span>
                    </div>
                  </div>

                  <div className="user-orders-list">
                    <h4>Histórico de Pedidos</h4>
                    {userOrders.length > 0 ? (
                      userOrders.map(order => (
                        <div key={order.id} className="user-order-item">
                          <div className="user-order-info">
                            <strong>Pedido #{order.id.slice(0, 8)}</strong>
                            <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="text-right">
                            <strong className="text-[var(--primary-color)]">R$ {order.total_amount.toFixed(2)}</strong>
                            <div className={`status-badge mt-1 inline-block ${order.status === 'completed' ? 'status-admin' : 'status-client'}`}>
                              {order.status}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{textAlign: 'center', padding: '1rem 0', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                        <ShoppingBag size={32} className="mb-2 opacity-50" />
                        Este usuário ainda não fez compras.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
