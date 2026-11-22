import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, BookOpen, ShoppingCart, ArrowLeft, MessageSquare, Bot, Layout, Settings, Users, TrendingUp, Tag, HelpCircle, Sparkles, CreditCard, Mail, Newspaper, Smartphone } from 'lucide-react';
import './AdminLayout.css';

export default function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Só exibe loader se estiver validando e AINDA não sabemos se o usuário é administrador
  // Se já sabemos que é admin (pelo cache instantâneo), abre o painel imediatamente (0ms)
  if (loading && !isAdmin) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loader"></div>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Verificando permissões de Administrador...</p>
        <button 
          onClick={() => navigate('/login')} 
          style={{ background: 'none', border: 'none', color: '#ea7458', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', marginTop: '8px' }}
        >
          Demorando? Clique aqui para fazer login
        </button>
      </div>
    );
  }

  // Proteção simples de rota cliente
  if (!isAdmin) {
    return (
      <div className="container admin-unauthorized section-padding text-center">
        <Shield size={48} className="unauthorized-icon" />
        <h2>Acesso Negado</h2>
        <p>Você precisa de credenciais de Administrador para acessar esta área.</p>
        <button onClick={() => navigate('/login')} className="btn btn-primary mt-4">
          Ir para Login
        </button>
      </div>
    );
  }

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className="admin-layout-container">
      {/* Sidebar do Administrador */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <Shield size={20} className="admin-header-icon" />
          <div>
            <h3>Painel Admin</h3>
            <span>Amoreja Amigurumi</span>
          </div>
        </div>

        <nav className="admin-nav-links">
          <Link to="/admin" className={`admin-nav-link ${isActive('/admin')}`}>
            <BookOpen size={16} /> Gerenciar Receitas
          </Link>
          <Link to="/admin/pedidos" className={`admin-nav-link ${isActive('/admin/pedidos')}`}>
            <ShoppingCart size={16} /> Vendas & Pedidos
          </Link>
          <Link to="/admin/emails" className={`admin-nav-link ${isActive('/admin/emails')}`}>
            <Mail size={16} /> Central de E-mails
          </Link>
          <hr className="admin-sidebar-divider" />
          <Link to="/admin/conteudo" className={`admin-nav-link ${isActive('/admin/conteudo')}`}>
            <Layout size={16} /> Conteúdo do Site
          </Link>
          <Link to="/admin/jornal" className={`admin-nav-link ${isActive('/admin/jornal')}`}>
            <Newspaper size={16} /> Aprovar Jornal
          </Link>
          <Link to="/admin/cupons" className={`admin-nav-link ${isActive('/admin/cupons')}`}>
            <Tag size={16} /> Cupons de Desconto
          </Link>
          <Link to="/admin/financeiro" className={`admin-nav-link ${isActive('/admin/financeiro')}`}>
            <TrendingUp size={16} /> Financeiro
          </Link>
          <hr className="admin-sidebar-divider" />
          <Link to="/admin/usuarios" className={`admin-nav-link ${isActive('/admin/usuarios')}`}>
            <Users size={16} /> Usuários & Parceiras
          </Link>
          <Link to="/parceiro" className="admin-nav-link" style={{ color: '#ea7458', fontWeight: 600 }}>
            <Sparkles size={16} color="#ea7458" /> 🧵 Canal da Parceira
          </Link>
          <Link to="/admin/whatsapp" className={`admin-nav-link ${isActive('/admin/whatsapp')}`}>
            <MessageSquare size={16} /> WhatsApp Amoreja
          </Link>
          <Link to="/admin/whatsapp-marcia" className={`admin-nav-link ${isActive('/admin/whatsapp-marcia')}`} style={{ color: isActive('/admin/whatsapp-marcia') ? 'var(--color-primary)' : '#059669', fontWeight: 600 }}>
            <Smartphone size={16} color="#059669" /> WhatsApp Márcia
          </Link>
          <Link to="/admin/configuracoes" className={`admin-nav-link ${isActive('/admin/configuracoes')}`}>
            <Settings size={16} /> Configurações Gerais
          </Link>

          <div className="admin-nav-divider"></div>

          <Link to="/admin/ajuda" className={`admin-nav-link ${isActive('/admin/ajuda')}`}>
            <HelpCircle size={16} /> Central de Ajuda
          </Link>
          
          <hr className="admin-sidebar-divider" />
          
          <Link to="/" className="admin-nav-link back-to-site">
            <ArrowLeft size={16} /> Voltar ao Site
          </Link>
        </nav>
      </aside>

      {/* Conteúdo Principal do Painel */}
      <main className={`admin-content-area ${location.pathname.includes('whatsapp') || location.pathname.includes('instagram-chat') || location.pathname.includes('instagram-ai') ? 'fullscreen-page' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
