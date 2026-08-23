import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, User, LogOut, Shield } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import './Navbar.css';

export default function Navbar({ cartCount, onCartClick }) {
  const { user, isAdmin, isPartner, isColumnist, signOut, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const [siteLogo, setSiteLogo] = useState({ url: '' });

  // Carrega logo do Supabase na montagem
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    supabase
      .from('new_amoreja_site_content')
      .select('image_url')
      .eq('section_key', 'logo')
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSiteLogo({
            url: data.image_url || ''
          });
        }
      });

    // Escuta atualizações ao vivo (quando admin salva no painel)
    const handleLogoUpdate = (e) => {
      if (e.detail) setSiteLogo(e.detail);
    };
    window.addEventListener('logo-updated', handleLogoUpdate);
    return () => window.removeEventListener('logo-updated', handleLogoUpdate);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo">
          {siteLogo.url ? (
            <img
              src={siteLogo.url}
              alt="Logo Amoreja"
              style={{ height: '36px', width: 'auto', objectFit: 'contain', borderRadius: '6px' }}
            />
          ) : (
            <>
              <span className="logo-emoji">🧶</span>
              <span className="logo-text">Amoreja</span>
            </>
          )}
        </Link>

        <nav className="navbar-links">
          <Link to="/" className="nav-link">Início</Link>
          <Link to="/loja" className="nav-link">Receitas</Link>
          <Link to="/maratonas" className="nav-link">Maratonas</Link>
          <Link to="/jornal" className="nav-link">Jornal</Link>
          {user && (
            <Link to="/painel" className="nav-link">Meu Painel</Link>
          )}
          {(isPartner || isAdmin) && (
            <Link to="/parceiro" className="nav-link partner-nav-link" style={{ color: '#ea7458', fontWeight: 'bold' }}>
              🧵 Canal da Parceira
            </Link>
          )}
          {(isColumnist || isAdmin) && (
            <Link to="/colunista" className="nav-link" style={{ color: '#2b6cb0', fontWeight: 'bold' }}>
              ✍️ Área do Colunista
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="nav-link admin-link">
              <Shield size={14} /> Admin
            </Link>
          )}
        </nav>

        <div className="navbar-actions">
          <button className="cart-btn" onClick={onCartClick} aria-label="Abrir Carrinho">
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>

          {user ? (
            <div className="user-menu-wrapper">
              <span className="user-email-badge">
                <User size={14} />
                {user.email.split('@')[0]}
              </span>
              <button onClick={handleLogout} className="logout-btn" title="Sair">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary login-btn">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
