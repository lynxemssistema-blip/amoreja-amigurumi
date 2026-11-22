import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, BookOpen, User, Menu, Flame } from 'lucide-react';
import './BottomNav.css';
import { useAuth } from '../context/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  
  // Função para verificar se a rota está ativa
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
        <Home size={22} className="nav-icon" />
        <span className="nav-label">Início</span>
      </Link>
      
      <Link to="/loja" className={`bottom-nav-item ${isActive('/loja') ? 'active' : ''}`}>
        <ShoppingBag size={22} className="nav-icon" />
        <span className="nav-label">Receitas</span>
      </Link>
      
      <Link to="/maratonas" className={`bottom-nav-item ${isActive('/maratonas') ? 'active' : ''}`}>
        <Flame size={22} className="nav-icon" />
        <span className="nav-label">Maratonas</span>
      </Link>
      
      <Link to="/jornal" className={`bottom-nav-item ${isActive('/jornal') ? 'active' : ''}`}>
        <BookOpen size={22} className="nav-icon" />
        <span className="nav-label">Jornal</span>
      </Link>
      
      {user ? (
        <Link to="/painel" className={`bottom-nav-item ${isActive('/painel') ? 'active' : ''}`}>
          <User size={22} className="nav-icon" />
          <span className="nav-label">Painel</span>
        </Link>
      ) : (
        <Link to="/login" className={`bottom-nav-item ${isActive('/login') ? 'active' : ''}`}>
          <User size={22} className="nav-icon" />
          <span className="nav-label">Entrar</span>
        </Link>
      )}
    </nav>
  );
}
