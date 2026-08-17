import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { Save, RefreshCw, Key, ShieldAlert, CheckCircle } from 'lucide-react';
import Instagram from '../../components/InstagramIcon';
import './ManageInstagram.css';

export default function ManageInstagram() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchToken = async () => {
      setLoading(true);
      if (!isSupabaseConfigured()) {
        const storedToken = localStorage.getItem('demo_instagram_token') || 'MTIzNDU2Nzg5MG1vY2t0b2tlbg==';
        setToken(storedToken);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('new_amoreja_settings')
          .select('value')
          .eq('key', 'instagram_access_token')
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Token não inserido ainda
            setToken('');
          } else {
            throw error;
          }
        } else if (data) {
          setToken(data.value);
        }
      } catch (err) {
        console.error("Erro ao obter token do banco:", err.message);
        setErrorMsg("Não foi possível carregar o token do banco de dados.");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  const handleSaveToken = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrorMsg('');

    if (!token) {
      setErrorMsg("O token não pode estar em branco.");
      return;
    }

    if (!isSupabaseConfigured()) {
      localStorage.setItem('demo_instagram_token', token);
      setMessage("Token do Instagram salvo localmente no Modo Demo!");
      return;
    }

    try {
      const { error } = await supabase
        .from('new_amoreja_settings')
        .upsert({ key: 'instagram_access_token', value: token, updated_at: new Date().toISOString() });

      if (error) throw error;
      setMessage("Token do Instagram atualizado com sucesso no Supabase!");
    } catch (err) {
      setErrorMsg("Erro ao salvar token: " + err.message);
    }
  };

  // Executa a sincronização oficial da API do Instagram (Opção A)
  const handleSyncFeed = async () => {
    setMessage('');
    setErrorMsg('');
    setSyncing(true);

    if (!token || token === 'COLOQUE_SEU_TOKEN_AQUI') {
      setErrorMsg("Por favor, insira um Access Token do Instagram válido primeiro.");
      setSyncing(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      // Simula chamada de API no Modo Demo
      setTimeout(() => {
        setMessage("Sincronização simulada! Os posts mais recentes foram puxados do feed do Instagram e salvos no cache local.");
        setSyncing(false);
      }, 1500);
      return;
    }

    try {
      // 1. Faz requisição para a API Graph do Instagram usando o token do cliente
      // Este endpoint busca as mídias do usuário logado
      const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
      const response = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&access_token=${token}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Falha na resposta da API do Instagram.");
      }

      const resJson = await response.json();
      const mediaList = resJson.data || [];

      if (mediaList.length === 0) {
        setMessage("A API retornou sucesso, mas nenhuma publicação foi encontrada neste perfil.");
        setSyncing(false);
        return;
      }

      // 2. Filtra imagens e vídeos (ignora mídias não suportadas ou busca a capa do vídeo)
      // Limitamos a puxar os 6 posts mais recentes para o cache
      const itemsToCache = mediaList.slice(0, 6).map(media => ({
        post_url: media.permalink,
        caption: media.caption || 'Publicação de Amoreja Amigurumi',
        image_url: media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url
      }));

      // 3. Atualiza a tabela instagram_posts do Supabase deletando mídias antigas e inserindo novas
      // Primeiro limpamos para garantir que reflete fielmente o feed atual
      const { error: deleteError } = await supabase.from('new_amoreja_instagram_posts').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Limpa tudo
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from('new_amoreja_instagram_posts').insert(itemsToCache);
      if (insertError) throw insertError;

      setMessage(`Feed atualizado com sucesso! ${itemsToCache.length} postagens sincronizadas da API do Instagram e salvas no banco de dados.`);
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro na sincronização oficial do Instagram: " + err.message + " Verifique se o token de acesso não expirou.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="manage-instagram-container">
      <div className="admin-page-header">
        <h2>Integração com Instagram (Opção A)</h2>
      </div>

      <div className="instagram-explanation-card">
        <ShieldAlert size={20} className="info-icon" />
        <div>
          <h4>Como funciona a Integração Oficial da API do Instagram?</h4>
          <p>
            Ao utilizar a <strong>Opção A</strong>, o site consome a <em>API Basic Display do Instagram</em>. 
            Você precisa gerar o Token de Acesso de Longa Duração no Facebook Developers e colá-lo abaixo. 
            Para evitar que o site atinja os limites de requisições do Instagram e carregue mais rápido para os clientes, 
            os posts são salvos em cache na tabela <code>instagram_posts</code>.
          </p>
        </div>
      </div>

      {message && <div className="alert alert-success"><CheckCircle size={14} /> {message}</div>}
      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}

      {loading ? (
        <div className="admin-loading">
          <div className="loader"></div>
        </div>
      ) : (
        <div className="token-form-wrapper">
          <form onSubmit={handleSaveToken} className="admin-form">
            <div className="form-group">
              <label className="form-label">
                <Key size={14} /> Instagram Access Token (Long-Lived)
              </label>
              <textarea 
                className="form-control font-mono font-12" 
                rows="5"
                value={token} 
                onChange={(e) => setToken(e.target.value)} 
                placeholder="Insira seu Access Token do Instagram aqui..."
              />
              <span className="input-hint">Esse token expira normalmente a cada 60 dias. Lembre-se de atualizá-lo para evitar falhas de sincronismo.</span>
            </div>

            <div className="form-actions-row">
              <button type="submit" className="btn btn-primary">
                <Save size={16} /> Salvar Token
              </button>
              
              <button 
                type="button" 
                onClick={handleSyncFeed} 
                className="btn btn-secondary btn-sync"
                disabled={syncing}
              >
                <RefreshCw size={16} className={syncing ? 'spinning' : ''} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Feed Agora'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
