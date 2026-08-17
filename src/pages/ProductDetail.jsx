import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { ArrowLeft, ShoppingCart, Check, Heart, ShieldAlert } from 'lucide-react';
import './ProductDetail.jsx.css';

const MOCK_PRODUCTS = [
  {
    id: '1',
    title: 'Gigi Love - Girafinha com Óculos',
    description: 'Receita completa para criar a Gigi Love, a girafinha elegante com óculos escuros de coração. Inclui tutorial detalhado passo a passo.',
    price: 29.90,
    image_url: 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=600&auto=format&fit=crop&q=80',
    difficulty: 'Médio',
    materials: 'Fio Amigurumi, Agulha 2.5mm, Olhos com trava de segurança, Enchimento acrílico, Óculos miniatura.',
    size: 'Cerca de 22cm de altura.'
  },
  {
    id: '2',
    title: 'Rodolph - A Rena de Natal',
    description: 'Aprenda a crochetar o simpático Rodolph, perfeito para decorações de Natal e presentes especiais de final de ano.',
    price: 34.90,
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
    difficulty: 'Fácil',
    materials: 'Fio Amigurumi nas cores marrom, vermelho e creme. Agulha 2.25mm. Enchimento.',
    size: 'Aproximadamente 18cm de altura.'
  },
  {
    id: '3',
    title: 'Princesa Jasmine',
    description: 'Design inspirado na Princesa Jasmine, contendo todos os detalhes do cabelo, tiara e roupa clássica.',
    price: 39.90,
    image_url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop&q=80',
    difficulty: 'Avançado',
    materials: 'Fio Amigurumi Soft, Agulha 2.0mm, Linha dourada metálica para joias, Enchimento.',
    size: 'Cerca de 25cm de altura.'
  }
];

export default function ProductDetail({ onAddToCart }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!isSupabaseConfigured()) {
        const found = MOCK_PRODUCTS.find(p => p.id === id);
        setProduct(found || MOCK_PRODUCTS[0]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('new_amoreja_products')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setProduct(data);
          setSelectedImage(data.image_url);
        } else {
          const found = MOCK_PRODUCTS.find(p => p.id === id);
          setProduct(found || MOCK_PRODUCTS[0]);
        }
      } catch (err) {
        console.error("Erro ao carregar detalhe da receita:", err.message);
        const found = MOCK_PRODUCTS.find(p => p.id === id);
        setProduct(found || MOCK_PRODUCTS[0]);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAdd = () => {
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="loader"></div>
        <p>Carregando detalhes da receita...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container detail-error-page">
        <h2>Receita não encontrada!</h2>
        <Link to="/loja" className="btn btn-primary">
          <ArrowLeft size={16} /> Voltar para Loja
        </Link>
      </div>
    );
  }

  return (
    <div className="product-detail-page container animate-fade-in">
      <div className="back-btn-wrapper">
        <Link to="/loja" className="back-link">
          <ArrowLeft size={16} /> Voltar para a Loja
        </Link>
      </div>

      <div className="detail-grid">
        <div className="detail-image-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <img src={selectedImage || product?.image_url} alt={product.title} className="detail-image" style={{ width: '100%', height: 'auto', borderRadius: '12px' }} />
          
          {product.gallery_images && product.gallery_images.length > 0 && (
            <div className="gallery-thumbnails" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
              <img 
                src={product.image_url} 
                alt="Capa"
                onClick={() => setSelectedImage(product.image_url)}
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: selectedImage === product.image_url ? '3px solid var(--primary-color)' : '1px solid #ddd' }}
              />
              {product.gallery_images.map((imgUrl, i) => (
                <img 
                  key={i}
                  src={imgUrl} 
                  alt={`Galeria ${i+1}`}
                  onClick={() => setSelectedImage(imgUrl)}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: selectedImage === imgUrl ? '3px solid var(--primary-color)' : '1px solid #ddd' }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <span className="detail-tag-difficulty">
            Nível: <strong>{product.difficulty || 'Médio'}</strong>
          </span>
          <h1 className="detail-title">{product.title}</h1>
          <div className="detail-price-badge">
            <span className="price-label">Valor da Receita:</span>
            <span className="price-value">R$ {parseFloat(product.price).toFixed(2)}</span>
          </div>

          <p className="detail-desc">{product.description}</p>

          <div className="detail-specs">
            <div className="spec-item">
              <span className="spec-title">📐 Tamanho Médio da Peça:</span>
              <p className="spec-desc">{product.size || 'Cerca de 20cm de altura (a depender do ponto).'}</p>
            </div>
            <div className="spec-item">
              <span className="spec-title">🧶 Materiais Recomendados:</span>
              <p className="spec-desc">{product.materials || 'Fio Amigurumi tradicional, agulha de crochê indicada, enchimento e olhos com travas.'}</p>
            </div>
          </div>

          <div className="detail-actions">
            <Link 
              to={`/checkout/${product.id}`}
              className="btn btn-primary btn-add-cart"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <ShoppingCart size={18} /> Comprar Agora
            </Link>
          </div>

          <div className="delivery-alert">
            <ShieldAlert size={20} className="alert-icon" />
            <div>
              <strong>Aviso de Entrega Digital:</strong>
              <p>Esta receita é um arquivo digital em PDF. Você receberá acesso imediato para download na sua conta após a confirmação do pagamento.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
