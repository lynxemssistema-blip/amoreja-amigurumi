import React from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, Heart, ToggleLeft, ToggleRight } from 'lucide-react';
import Instagram from './InstagramIcon';
import './Footer.css';

export default function Footer() {
  const { isDemoMode, isAdmin, toggleDemoAdmin } = useAuth();

  return (
    <footer className="footer-wrapper">
      <div className="container footer-container">
        <div className="footer-info">
          <h3 className="footer-title">Amoreja Amigurumi</h3>
          <p className="footer-desc">
            Transformando fios em abraços quentinhos e espalhando amor através de pontos de crochê.
          </p>
          <div className="footer-socials">
            <a 
              href="https://www.instagram.com/amorejaamigurumi/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="social-icon instagram"
              aria-label="Siga-nos no Instagram"
            >
              <Instagram size={20} />
            </a>
            <a 
              href="https://chat.whatsapp.com/DvGLoH4qisk2ir4copcYSm?s=hd&p=i&ilr=0" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="social-icon whatsapp"
              aria-label="Entre no Grupo das Amorejas"
            >
              <MessageCircle size={20} />
            </a>
          </div>
        </div>

        <div className="footer-links-section">
          <h4 className="footer-section-title">Links Úteis</h4>
          <ul className="footer-links-list">
            <li><a href="/" className="footer-link">Início</a></li>
            <li><a href="/loja" className="footer-link">Receitas</a></li>
            <li><a href="https://www.instagram.com/mda.festivaldasestacoes" target="_blank" rel="noreferrer" className="footer-link">Festival das Estações</a></li>
          </ul>
        </div>

        <div className="footer-contact">
          <h4 className="footer-section-title">Contato</h4>
          <p className="footer-contact-text">Dúvidas com seu pedido? Entre em contato no nosso grupo do WhatsApp para suporte rápido.</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-container">
          <p className="copy-text">
            &copy; {new Date().getFullYear()} Amoreja Amigurumi. Feito com <Heart size={12} className="heart-icon" /> para fins de estudo.
          </p>

          {isDemoMode && (
            <div className="demo-toggle-container">
              <span className="demo-badge">Modo Estudo / Demo Ativo</span>
              <button onClick={toggleDemoAdmin} className="demo-toggle-btn" title="Alternar entre Admin e Cliente comum">
                {isAdmin ? (
                  <>
                    <span className="toggle-label admin-active">Perfil: Admin</span>
                    <ToggleRight size={24} className="toggle-icon-active" />
                  </>
                ) : (
                  <>
                    <span className="toggle-label">Perfil: Cliente</span>
                    <ToggleLeft size={24} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
