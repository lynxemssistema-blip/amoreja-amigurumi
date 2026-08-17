import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Eye } from 'lucide-react';
import './ProductCard.css';

export default function ProductCard({ product, onAddToCart }) {
  const { id, title, description, price, image_url, difficulty } = product;

  // Normaliza o estilo da dificuldade para a classe CSS do badge
  const getDifficultyClass = (diff) => {
    const d = (diff || 'médio').toLowerCase();
    if (d.includes('fácil') || d.includes('facil')) return 'badge-facil';
    if (d.includes('avançado') || d.includes('avancado')) return 'badge-avancado';
    return 'badge-medio';
  };

  const maratonaTitle = product.new_amoreja_maratonas?.title;

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
            <Link to={`/receita/${id}`} className="btn-card-icon" title="Ver Detalhes">
              <Eye size={18} />
            </Link>
            <button 
              onClick={() => onAddToCart(product)} 
              className="btn-card-action"
              title="Adicionar ao Carrinho"
            >
              <ShoppingCart size={16} />
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
