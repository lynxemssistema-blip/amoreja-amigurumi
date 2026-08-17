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
      setUsers(data || []);
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
      alert("Erro ao excluir usuário: " + err.message + "\n\nSe houver restrição de RLS, você precisa adicionar uma política de DELETE para administradores na tabela 'new_amoreja_profiles'.");
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

  const filteredUsers = users.filter(user => 
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.instagram_handle && user.instagram_handle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="manage-users-container">
      <div className="admin-page-header flex-col-sm">
        <div className="header-title">
          <h2>Usuários e Permissões</h2>
          <p>Gerencie quem tem acesso ao painel de administração da loja.</p>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por nome, e-mail ou @..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
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
                <th>Permissão</th>
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
                      <span className={`status-badge ${user.is_admin ? 'status-admin' : 'status-client'}`}>
                        {user.is_admin ? 'Administrador' : 'Cliente'}
                      </span>
                      {user.is_active === false && (
                        <span className="status-badge" style={{ background: '#fee2e2', color: '#ef4444' }}>Desativado</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right actions-cell">

                    <button 
                      onClick={() => openUserModal(user)}
                      className="btn-view-user"
                      title="Ver Resumo de Compras"
                    >
                      <Eye size={16} /> Ver
                    </button>
                    <button 
                      onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                      className={`btn-toggle-admin ${user.is_admin ? 'remove-admin' : 'make-admin'}`}
                      title={user.is_admin ? "Remover acesso de Administrador" : "Conceder acesso de Administrador"}
                    >
                      {user.is_admin ? (
                        <><ShieldOff size={16} /> Rebaixar</>
                      ) : (
                        <><Shield size={16} /> Tornar Admin</>
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
