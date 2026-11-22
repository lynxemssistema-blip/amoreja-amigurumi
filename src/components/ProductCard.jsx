import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye, ExternalLink } from 'lucide-react';
import { getPaymentPlatformInfo } from '../utils/paymentPlatform';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const { id, title, description, price, image_url, difficulty, mp_payment_link } = product;

  // Normaliza o estilo da dificuldade para a classe CSS do badge
  const getDifficultyClass = (diff) => {
    const d = (diff || 'médio').toLowerCase();
    if (d.includes('fácil') || d.includes('facil')) return 'badge-facil';
    if (d.includes('avançado') || d.includes('avancado')) return 'badge-avancado';
    return 'badge-medio';
  };

  const maratonaTitle = product.new_amoreja_maratonas?.title;
  const platform = getPaymentPlatformInfo(mp_payment_link);

  return (
    <div className="product-card animate-fade-in">
      <div className="card-image-wrapper">
        <img 
          src={image_url || 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=600&auto=format&fit=crop&q=80'} 
          alt={title} 
          className="card-image"
          loading="lazy"
        />
        <div className="card-badge-overlay" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          <span className={`badge ${getDifficultyClass(difficulty)}`}>
            {difficulty || 'Médio'}
          </span>
          <span 
            className="badge" 
            style={{ background: platform.color, color: platform.textColor, fontWeight: 700, fontSize: '0.7rem' }}
          >
            🔥 {platform.badge}
          </span>
        </div>
      </div>

      <div className="card-content">
        {maratonaTitle && (
          <span className="badge" style={{ background: '#e0f7fa', color: '#006064', fontSize: '0.65rem', marginBottom: '8px', display: 'inline-block' }}>
            {maratonaTitle}
          </span>
        )}
        <h3 className="card-title">{title}</h3>
        <p className="card-desc">{description || 'Receita detalhada de Amigurumi'}</p>
        
        <div className="card-footer">
          <span className="card-price">R$ {parseFloat(price).toFixed(2)}</span>
          <div className="card-buttons">
            <Link to={`/receita/${id}`} className="btn-card-icon" title="Ver Detalhes da Receita">
              <Eye size={18} />
            </Link>
            {mp_payment_link ? (
              <a 
                href={mp_payment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-card-action"
                style={{ 
                  background: platform.color, 
                  color: platform.textColor, 
                  borderColor: platform.color,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600
                }}
                title={`Comprar no ${platform.badge}`}
              >
                <ExternalLink size={14} />
                Comprar
              </a>
            ) : (
              <a 
                href={`https://hotmart.com/pt-br/marketplace/produtos?q=${encodeURIComponent(title || 'Amoreja Amigurumi')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-card-action"
                style={{ 
                  background: '#F04E23', 
                  color: '#ffffff', 
                  borderColor: '#F04E23',
                  textDecoration: 'none', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  fontWeight: 600
                }}
                title="Comprar no Hotmart"
              >
                <ExternalLink size={14} />
                Hotmart
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
