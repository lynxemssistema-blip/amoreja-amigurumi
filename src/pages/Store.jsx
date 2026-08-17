import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import ProductCard from '../components/ProductCard';
import { Search } from 'lucide-react';
import './Store.css';

const MOCK_PRODUCTS = [
  {
    id: '1',
    title: 'Gigi Love - Girafinha com Óculos',
    description: 'Receita completa para criar a Gigi Love, a girafinha elegante com óculos escuros de coração. Inclui tutorial detalhado passo a passo.',
    price: 29.90,
    image_url: 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=600&auto=format&fit=crop&q=80',
    difficulty: 'Médio'
  },
  {
    id: '2',
    title: 'Rodolph - A Rena de Natal',
    description: 'Aprenda a crochetar o simpático Rodolph, perfeito para decorações de Natal e presentes especiais de final de ano.',
    price: 34.90,
    image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
    difficulty: 'Fácil'
  },
  {
    id: '3',
    title: 'Princesa Jasmine',
    description: 'Design inspirado na Princesa Jasmine, contendo todos os detalhes do cabelo, tiara e roupa clássica.',
    price: 39.90,
    image_url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop&q=80',
    difficulty: 'Avançado'
  }
];

export default function Store({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Todos');
  const [selectedMaratona, setSelectedMaratona] = useState('Todas');
  const [maratonas, setMaratonas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!isSupabaseConfigured()) {
        setProducts(MOCK_PRODUCTS);
        setFilteredProducts(MOCK_PRODUCTS);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('new_amoreja_products')
          .select('*, new_amoreja_maratonas(title)')
          .order('created_at', { ascending: false });

        const { data: maratonasData } = await supabase
          .from('new_amoreja_maratonas')
          .select('id, title')
          .order('sort_order', { ascending: true });
          
        if (maratonasData) setMaratonas(maratonasData);

        if (error) throw error;

        if (data && data.length > 0) {
          const activeProducts = data.filter(p => p.is_active !== false);
          setProducts(activeProducts);
          setFilteredProducts(activeProducts);
        } else {
          setProducts(MOCK_PRODUCTS);
          setFilteredProducts(MOCK_PRODUCTS);
        }
      } catch (err) {
        console.error("Erro ao carregar receitas na loja:", err.message);
        setProducts(MOCK_PRODUCTS);
        setFilteredProducts(MOCK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filtros em tempo real
  useEffect(() => {
    let result = products;

    // Filtro por termo de busca
    if (searchTerm) {
      result = result.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por dificuldade
    if (selectedDifficulty !== 'Todos') {
      result = result.filter(product => 
        (product.difficulty || 'Médio').toLowerCase() === selectedDifficulty.toLowerCase()
      );
    }

    // Filtro por maratona
    if (selectedMaratona !== 'Todas') {
      result = result.filter(product => product.maratona_id === selectedMaratona);
    }

    setFilteredProducts(result);
  }, [searchTerm, selectedDifficulty, selectedMaratona, products]);

  return (
    <div className="store-page container section-padding">
      <div className="store-header">
        <h1 className="store-title">Receitas de Amigurumi</h1>
        <p className="store-subtitle">Adquira as receitas em formato PDF digital e baixe-as instantaneamente no seu painel.</p>
      </div>

      {/* Barra de Filtros */}
      <div className="store-filters-bar">
        <div className="search-box-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar receita..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="difficulty-filters">
          <span className="filter-label">Dificuldade:</span>
          {['Todos', 'Fácil', 'Médio', 'Avançado'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`filter-btn ${selectedDifficulty === diff ? 'active' : ''}`}
            >
              {diff}
            </button>
          ))}
        </div>
        
        <div className="difficulty-filters" style={{ marginTop: '10px', gap: '10px' }}>
          <span className="filter-label">Maratona:</span>
          <select 
            value={selectedMaratona} 
            onChange={(e) => setSelectedMaratona(e.target.value)}
            className="search-input"
            style={{ width: 'auto', padding: '6px 12px', flex: 1, maxWidth: '300px' }}
          >
            <option value="Todas">Todas as Maratonas</option>
            {maratonas.map(m => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Listagem */}
      {loading ? (
        <div className="store-loading">
          <div className="loader"></div>
          <p>Carregando as receitas...</p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid-responsive">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onAddToCart={onAddToCart} 
            />
          ))}
        </div>
      ) : (
        <div className="store-empty">
          <p>Nenhuma receita encontrada para os filtros aplicados.</p>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedDifficulty('Todos'); }} 
            className="btn btn-primary"
          >
            Limpar Filtros
          </button>
        </div>
      )}
    </div>
  );
}
