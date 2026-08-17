import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { Plus, Edit, Trash, Check, X, BookOpen, UploadCloud } from 'lucide-react';
import './ManageProducts.css';

const INITIAL_MOCK = [
  {
    id: '1',
    title: 'Gigi Love - Girafinha com Óculos',
    description: 'Receita completa para criar a Gigi Love, a girafinha elegante com óculos escuros de coração. Inclui tutorial detalhado passo a passo.',
    price: 29.90,
    image_url: 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=600&auto=format&fit=crop&q=80',
    difficulty: 'Médio',
    pdf_path: 'receitas/gigi_love.pdf',
    gallery_images: []
  }
];

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [maratonas, setMaratonas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Controle de formulário
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [difficulty, setDifficulty] = useState('Médio');
  const [isActive, setIsActive] = useState(true);
  const [isFree, setIsFree] = useState(false);
  const [maratonaId, setMaratonaId] = useState('');
  
  // Arquivos originais (urls ou paths)
  const [imageUrl, setImageUrl] = useState('');
  const [pdfPath, setPdfPath] = useState('');
  const [existingGallery, setExistingGallery] = useState([]);
  
  // Uploads
  const [coverFile, setCoverFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const [message, setMessage] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    if (!isSupabaseConfigured()) {
      const stored = localStorage.getItem('demo_products');
      if (stored) {
        setProducts(JSON.parse(stored));
      } else {
        setProducts(INITIAL_MOCK);
        localStorage.setItem('demo_products', JSON.stringify(INITIAL_MOCK));
      }
      setLoading(false);
      return;
    }

    try {
      const { data: productsData, error: productsError } = await supabase
        .from('new_amoreja_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;
      setProducts(productsData || []);

      const { data: maratonasData, error: maratonasError } = await supabase
        .from('new_amoreja_maratonas')
        .select('id, title')
        .order('sort_order', { ascending: true });
        
      if (!maratonasError) {
        setMaratonas(maratonasData || []);
      }
    } catch (err) {
      console.error(err.message);
      setProducts(INITIAL_MOCK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setDifficulty('Médio');
    setIsActive(true);
    setIsFree(false);
    setMaratonaId('');
    setImageUrl('');
    setPdfPath('');
    setExistingGallery([]);
    setCoverFile(null);
    setPdfFile(null);
    setGalleryFiles([]);
    setIsEditing(false);
    setIsUploading(false);
    setUploadStatus('');
  };

  const handleEditClick = (product) => {
    setEditId(product.id);
    setTitle(product.title);
    setDescription(product.description || '');
    setPrice(product.price);
    setDifficulty(product.difficulty || 'Médio');
    setIsActive(product.is_active !== false); // Default true if undefined
    setIsFree(product.is_free === true); // Default false if undefined
    setMaratonaId(product.maratona_id || '');
    setImageUrl(product.image_url || '');
    setPdfPath(product.pdf_path || '');
    setExistingGallery(product.gallery_images || []);
    setCoverFile(null);
    setPdfFile(null);
    setGalleryFiles([]);
    setIsEditing(true);
  };

  const uploadFile = async (bucket, file, folder) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: false });
    
    if (error) throw error;
    
    if (bucket === 'produto_imagens') {
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    }
    
    return data.path; // For PDFs
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!title || !price) {
      alert("Título e Preço são obrigatórios.");
      return;
    }
    
    // Se não tiver Supabase configurado (demo mode)
    if (!isSupabaseConfigured()) {
      alert("Modo de demonstração: Upload de arquivos requer conexão com banco de dados real.");
      resetForm();
      return;
    }

    setIsUploading(true);

    try {
      let finalImageUrl = imageUrl;
      let finalPdfPath = pdfPath;
      let finalGallery = [...existingGallery];

      if (coverFile) {
        setUploadStatus('Fazendo upload da Capa...');
        finalImageUrl = await uploadFile('produto_imagens', coverFile, 'capas');
      }

      if (pdfFile) {
        setUploadStatus('Fazendo upload do PDF...');
        finalPdfPath = await uploadFile('receitas_pdf', pdfFile, 'receitas');
      }

      if (galleryFiles.length > 0) {
        setUploadStatus('Fazendo upload da Galeria...');
        for (let i = 0; i < galleryFiles.length; i++) {
          const url = await uploadFile('produto_imagens', galleryFiles[i], 'galeria');
          finalGallery.push(url);
        }
      }

      setUploadStatus('Salvando dados...');

      const payload = {
        title,
        description,
        price: parseFloat(price) || 0,
        difficulty,
        is_active: isActive,
        is_free: isFree,
        maratona_id: maratonaId || null,
        image_url: finalImageUrl,
        pdf_path: finalPdfPath,
        gallery_images: finalGallery
      };

      if (editId) {
        const { error } = await supabase
          .from('new_amoreja_products')
          .update(payload)
          .eq('id', editId);
        if (error) throw error;
        setMessage('Receita atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('new_amoreja_products')
          .insert([payload]);
        if (error) throw error;
        setMessage('Nova receita salva e publicada!');
      }
      loadProducts();
      resetForm();
    } catch (err) {
      alert("Erro ao salvar produto: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente deletar esta receita? (Isso não deletará os arquivos do Storage)")) return;

    if (!isSupabaseConfigured()) {
      const list = products.filter(p => p.id !== id);
      setProducts(list);
      return;
    }

    try {
      const { error } = await supabase
        .from('new_amoreja_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setMessage('Receita excluída do banco!');
      loadProducts();
    } catch (err) {
      alert("Erro ao deletar: " + err.message);
    }
  };

  const removeGalleryImage = (indexToRemove) => {
    setExistingGallery(existingGallery.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="manage-products-container">
      <div className="admin-page-header">
        <h2>Gerenciamento de Receitas</h2>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="btn btn-primary">
            <Plus size={16} /> Cadastrar Nova Receita
          </button>
        )}
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      {isEditing ? (
        <div className="product-form-card">
          <div className="form-header">
            <h3>{editId ? 'Editar Receita' : 'Nova Receita em PDF'}</h3>
            <button onClick={resetForm} className="btn-close-form" disabled={isUploading}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave} className="admin-form">
            <div className="form-grid">
              
              <div className="form-group col-span-2">
                <label className="form-label">Título da Receita *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Ex: Gigi Love - Girafinha"
                  disabled={isUploading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preço (R$) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-control" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  placeholder="Ex: 29.90"
                  disabled={isUploading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nível de Dificuldade</label>
                <select 
                  className="form-control" 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value)}
                  disabled={isUploading}
                >
                  <option value="Fácil">Fácil</option>
                  <option value="Médio">Médio</option>
                  <option value="Avançado">Avançado</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Maratona Vinculada</label>
                <select 
                  className="form-control" 
                  value={maratonaId} 
                  onChange={(e) => setMaratonaId(e.target.value)}
                  disabled={isUploading}
                >
                  <option value="">Nenhuma maratona</option>
                  {maratonas.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              {/* UPLOADS DE ARQUIVOS */}
              <div className="form-group col-span-2" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <h4 style={{ marginBottom: '15px', color: 'var(--primary-color)' }}>Arquivos e Imagens</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  {/* Arquivo PDF */}
                  <div>
                    <label className="form-label" style={{fontWeight: 'bold'}}>1. Arquivo PDF (Receita) *</label>
                    {pdfPath && !pdfFile && <p style={{fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem'}}>Arquivo atual: {pdfPath.split('/').pop()}</p>}
                    <input 
                      type="file" 
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files[0])} 
                      className="form-control"
                      disabled={isUploading}
                    />
                  </div>

                  {/* Imagem de Capa */}
                  <div>
                    <label className="form-label" style={{fontWeight: 'bold'}}>2. Imagem de Capa (Mestre) *</label>
                    {imageUrl && !coverFile && <div className="mb-2"><img src={imageUrl} alt="Capa Atual" style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px'}}/></div>}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files[0])} 
                      className="form-control"
                      disabled={isUploading}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <label className="form-label" style={{fontWeight: 'bold'}}>3. Galeria (Carrossel)</label>
                  <p style={{fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem'}}>Selecione várias imagens para mostrar mais detalhes do Amigurumi.</p>
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    onChange={(e) => setGalleryFiles(Array.from(e.target.files))} 
                    className="form-control"
                    disabled={isUploading}
                  />
                  
                  {/* Miniaturas da Galeria Atual */}
                  {existingGallery.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {existingGallery.map((imgUrl, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={imgUrl} alt="Galeria" style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px'}}/>
                          <button 
                            type="button" 
                            onClick={() => removeGalleryImage(i)}
                            style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', padding: '2px', border: 'none', cursor: 'pointer' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group col-span-2 form-toggles-row">
                <label className="toggle-switch-label">
                  <input 
                    type="checkbox" 
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={isUploading}
                    className="toggle-checkbox"
                  />
                  <div className="toggle-slider"></div>
                  <span className="toggle-text">Receita Ativa (Visível na loja)</span>
                </label>

                <label className="toggle-switch-label">
                  <input 
                    type="checkbox" 
                    checked={isFree}
                    onChange={(e) => setIsFree(e.target.checked)}
                    disabled={isUploading}
                    className="toggle-checkbox"
                  />
                  <div className="toggle-slider"></div>
                  <span className="toggle-text">Receita Grátis (R$ 0,00)</span>
                </label>
              </div>

              <div className="form-group col-span-2">
                <label className="form-label">Descrição / Detalhes da Receita</label>
                <textarea 
                  className="form-control" 
                  rows="4"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Conteúdo incluído, tamanho estimado e observações."
                  disabled={isUploading}
                ></textarea>
              </div>
            </div>

            <div className="form-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px' }}>
              {isUploading && (
                <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary-color)', gap: '8px' }}>
                  <UploadCloud className="animate-bounce" size={20} />
                  <span className="font-semibold">{uploadStatus}</span>
                </div>
              )}
              
              <button type="button" onClick={resetForm} className="btn btn-outline" disabled={isUploading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={isUploading}>
                {isUploading ? 'Salvando...' : <><Check size={16} /> Salvar Receita</>}
              </button>
            </div>
          </form>
        </div>
      ) : loading ? (
        <div className="admin-loading">
          <div className="loader"></div>
        </div>
      ) : products.length > 0 ? (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Capa</th>
                <th>Título</th>
                <th>Maratona</th>
                <th>Galeria</th>
                <th>Status</th>
                <th>Preço / Tipo</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <img 
                      src={product.image_url} 
                      alt="" 
                      className="table-product-thumbnail" 
                    />
                  </td>
                  <td>
                    <strong>{product.title}</strong>
                  </td>
                  <td>
                    {product.maratona_id ? (
                      <span className="badge" style={{background: '#e0f7fa', color: '#006064'}}>{maratonas.find(m => m.id === product.maratona_id)?.title || 'Desconhecida'}</span>
                    ) : (
                      <span className="text-muted" style={{fontSize: '0.8rem'}}>-</span>
                    )}
                  </td>
                  <td>
                    {product.gallery_images && product.gallery_images.length > 0 ? (
                      <span className="badge badge-medio">{product.gallery_images.length} fotos</span>
                    ) : (
                      <span className="text-muted" style={{fontSize: '0.8rem'}}>Nenhuma</span>
                    )}
                  </td>
                  <td>
                    {product.is_active ? (
                      <span className="badge badge-medio">Ativa</span>
                    ) : (
                      <span className="badge text-muted" style={{border: '1px solid #ddd'}}>Inativa</span>
                    )}
                  </td>
                  <td>
                    {product.is_free ? (
                      <strong style={{color: '#32BCAD'}}>Grátis</strong>
                    ) : (
                      `R$ ${parseFloat(product.price).toFixed(2)}`
                    )}
                  </td>
                  <td className="text-right">
                    <div className="actions-cell">
                      <button 
                        onClick={() => handleEditClick(product)} 
                        className="btn-action-icon edit" 
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)} 
                        className="btn-action-icon delete" 
                        title="Excluir"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">
          <BookOpen size={48} className="text-muted" />
          <p>Nenhuma receita cadastrada ainda.</p>
        </div>
      )}
    </div>
  );
}
