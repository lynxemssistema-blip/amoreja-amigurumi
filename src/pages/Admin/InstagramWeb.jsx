import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Search, Send, Bot, MessageCircle, RefreshCw, Heart, ShieldAlert, CheckCircle, XCircle, BadgeCheck, X, UserPlus, UserCheck, Settings, Save, Key, Trash2, Plus, Users, Sparkles, Sliders } from 'lucide-react';
import InstagramIcon from '../../components/InstagramIcon';
import { formatTimeAgo } from '../../utils/timeAgo';
import InstagramAI from './InstagramAI';
import './InstagramWeb.css';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const AI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];

export default function InstagramWeb({ defaultTab = 'direct' }) {
  // Controle de Abas Unificadas: 'direct' (Chat) | 'ai' (Gerador de Posts) | 'accounts' (Gerenciar Contas)
  const [mainActiveTab, setMainActiveTab] = useState(defaultTab);

  React.useEffect(() => {
    setMainActiveTab(defaultTab);
  }, [defaultTab]);

  // Controle de Múltiplas Contas do Instagram
  const [instagramAccounts, setInstagramAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [activeAccount, setActiveAccount] = useState(null);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);

  // Estados do Chat / Direct
  const [contacts, setContacts] = useState([]);
  const [activeContactId, setActiveContactId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [aiMessages, setAiMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputMessage, setInputMessage] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mediaErrors, setMediaErrors] = useState({});
  const [accountImageErrors, setAccountImageErrors] = useState({});
  const [contactImageErrors, setContactImageErrors] = useState({});

  // Controle de Abas: 'inbox' (mensagens) ou 'requests' (solicitações)
  const [activeTab, setActiveTab] = useState('inbox');

  // Controle de Notificações
  const [showNotifications, setShowNotifications] = useState(false);
  const [igToken, setIgToken] = useState(null);
  const [notificationFilter, setNotificationFilter] = useState('all');

  // Controle do painel de Configurações (token + sync do feed, unificado do antigo /admin/instagram)
  const [showSettings, setShowSettings] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [postsCount, setPostsCount] = useState(0);
  const [savingToken, setSavingToken] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingConversations, setSyncingConversations] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');

  const messagesEndRef = useRef(null);

  // Carrega contas apenas no início
  useEffect(() => {
    loadInstagramAccounts();
    loadNotifications();
  }, []);

  // Recarrega contatos quando a conta ativa mudar
  useEffect(() => {
    loadContacts();
  }, [activeAccount]);

  // Gerencia as conexões de realtime e escuta novas mensagens
  useEffect(() => {
    if (!activeContactId) return;

    const messagesChannel = supabase
      .channel('public:new_amoreja_ig_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'new_amoreja_ig_messages' }, payload => {
        const newMsg = payload.new;
        if (newMsg.contact_id === activeContactId && !newMsg.is_from_me) {
          setMessages(prev => {
            if (prev.some(x => x.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      })
      .subscribe();

    const contactsChannel = supabase
      .channel('public:new_amoreja_ig_contacts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'new_amoreja_ig_contacts' }, () => {
        loadContacts();
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel('public:new_amoreja_ig_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'new_amoreja_ig_notifications' }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(contactsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [activeContactId, activeAccount]);

  const loadInstagramAccounts = async () => {
    if (!isSupabaseConfigured()) return;
    setFetchingAccounts(true);
    try {
      const { data, error } = await supabase
        .from('new_amoreja_instagram_accounts')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setInstagramAccounts(data || []);
      
      // Carrega a conta salva/selecionada anteriormente no localStorage
      const savedId = localStorage.getItem('selected_ig_account_id');
      const active = data?.find(a => a.id === savedId) || data?.[0] || null;
      
      if (active) {
        setSelectedAccountId(active.id);
        setActiveAccount(active);
        setIgToken(active.access_token);
        setTokenInput(active.access_token);
      }
    } catch (err) {
      console.error('Erro ao carregar contas do Instagram:', err);
    } finally {
      setFetchingAccounts(false);
    }
  };

  const attemptedAccountResolutionRef = useRef(new Set());

  // Auto-resolução de ID, Username e Foto de Perfil da conta ativa se estiverem vazios
  useEffect(() => {
    if (!activeAccount || !activeAccount.access_token || !isSupabaseConfigured()) return;
    
    // Evita executar mais de uma vez para a mesma conta
    if (attemptedAccountResolutionRef.current.has(activeAccount.id)) return;
    attemptedAccountResolutionRef.current.add(activeAccount.id);

    // Se todos os campos já estiverem preenchidos, não faz nada
    if (activeAccount.instagram_user_id && activeAccount.instagram_username && activeAccount.profile_picture_url) return;

    const resolveAccountMetadata = async () => {
      try {
        let igUserId = activeAccount.instagram_user_id;
        let igUsername = activeAccount.instagram_username;
        let profilePicUrl = activeAccount.profile_picture_url;

        // 1. Resolve ID e Username se faltarem
        if (!igUserId || !igUsername) {
          const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${activeAccount.access_token}`);
          if (meRes.ok) {
            const meData = await meRes.json();
            igUserId = meData.id;
            igUsername = meData.username;
          }
        }

        // 2. Resolve Foto de Perfil se faltar (precisa do ID resolvido)
        if (igUserId && !profilePicUrl) {
          try {
            const picRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}?fields=profile_picture_url&access_token=${activeAccount.access_token}`);
            if (picRes.ok) {
              const picData = await picRes.json();
              if (picData.profile_picture_url) {
                profilePicUrl = await persistMediaToStorage(picData.profile_picture_url, `account_${igUserId}`);
              }
            }
          } catch (picErr) {
            console.warn('Erro ao carregar foto de perfil da conta conectada:', picErr);
          }
        }

        // 3. Atualiza no Supabase
        const updatePayload = {
          instagram_user_id: igUserId || activeAccount.instagram_user_id,
          instagram_username: igUsername || activeAccount.instagram_username,
          profile_picture_url: profilePicUrl || activeAccount.profile_picture_url
        };

        const { error } = await supabase
          .from('new_amoreja_instagram_accounts')
          .update(updatePayload)
          .eq('id', activeAccount.id);

        if (!error) {
          // Atualiza o estado local
          setActiveAccount(prev => ({
            ...prev,
            ...updatePayload
          }));
          // Atualiza a lista geral
          setInstagramAccounts(prev => prev.map(a => a.id === activeAccount.id ? {
            ...a,
            ...updatePayload
          } : a));
        }
      } catch (err) {
        console.warn('Erro ao resolver dados da conta no background:', err);
      }
    };

    resolveAccountMetadata();
  }, [activeAccount]);

  const handleAccountChange = (accountId) => {
    const active = instagramAccounts.find(a => a.id === accountId);
    if (active) {
      setSelectedAccountId(accountId);
      setActiveAccount(active);
      setIgToken(active.access_token);
      setTokenInput(active.access_token);
      localStorage.setItem('selected_ig_account_id', accountId);
      // Recarrega contatos e mensagens da conta ativa
      loadContacts();
    }
  };

  const fetchIgToken = async () => {
    if (activeAccount) {
      setIgToken(activeAccount.access_token);
      setTokenInput(activeAccount.access_token);
    }
    loadPostsCount();
  };

  const loadPostsCount = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { count, error } = await supabase
        .from('new_amoreja_instagram_posts')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      setPostsCount(count || 0);
    } catch (e) {
      console.warn('Erro ao contar posts em cache:', e);
    }
  };

  const isTokenValid = (t) => !!t && !t.startsWith('MTIzNDU2') && t !== 'COLOQUE_SEU_TOKEN_AQUI';

  const handleSaveToken = async (e) => {
    e.preventDefault();
    setSettingsMessage('');
    setSettingsError('');

    if (!tokenInput) {
      setSettingsError('O token não pode estar em branco.');
      return;
    }

    if (!isSupabaseConfigured()) {
      localStorage.setItem('demo_instagram_token', tokenInput);
      setIgToken(tokenInput);
      setSettingsMessage('Token do Instagram salvo localmente no Modo Demo!');
      return;
    }

    setSavingToken(true);
    try {
      const { error } = await supabase
        .from('new_amoreja_settings')
        .upsert({ key: 'instagram_access_token', value: tokenInput, updated_at: new Date().toISOString() });
      if (error) throw error;
      setIgToken(tokenInput);
      setSettingsMessage('Token do Instagram atualizado com sucesso!');
    } catch (err) {
      setSettingsError('Erro ao salvar token: ' + err.message);
    } finally {
      setSavingToken(false);
    }
  };

  const handleSyncFeed = async () => {
    setSettingsMessage('');
    setSettingsError('');
    setSyncing(true);

    const token = activeAccount?.access_token || tokenInput;

    if (!isTokenValid(token)) {
      setSettingsError('Por favor, insira um Access Token do Instagram válido primeiro.');
      setSyncing(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setTimeout(() => {
        setSettingsMessage('Sincronização simulada! Os posts mais recentes foram puxados do feed do Instagram e salvos no cache local.');
        setSyncing(false);
      }, 1500);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('instagram-sync', {
        method: 'POST',
        body: { access_token: token, instagram_user_id: activeAccount?.instagram_user_id }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (!data.count) {
        setSettingsMessage('A API retornou sucesso, mas nenhuma publicação foi encontrada neste perfil.');
      } else {
        setSettingsMessage(`Feed atualizado com sucesso! ${data.count} postagens sincronizadas.`);
        loadPostsCount();
      }
    } catch (err) {
      console.error(err);
      setSettingsError('Erro na sincronização do Instagram: ' + err.message + ' Verifique se o token de acesso não expirou.');
    } finally {
      setSyncing(false);
    }
  };

  // Importa conversas reais do Instagram (últimos 30 dias) via graph.instagram.com
  const handleSyncConversations = async () => {
    setSettingsMessage('');
    setSettingsError('');
    setSyncingConversations(true);

    const token = activeAccount?.access_token || tokenInput;

    if (!isTokenValid(token)) {
      setSettingsError('Por favor, insira um Access Token do Instagram válido primeiro.');
      setSyncingConversations(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setSettingsError('Sincronização de conversas não está disponível no Modo Demo.');
      setSyncingConversations(false);
      return;
    }

    try {
      const meRes = await fetch(`https://graph.instagram.com/me?fields=id&access_token=${token}`);
      if (!meRes.ok) throw new Error((await meRes.json()).error?.message || 'Não foi possível identificar a conta.');
      const { id: myId } = await meRes.json();

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const conversationIds = [];
      let nextUrl = `https://graph.instagram.com/me/conversations?fields=id,updated_time&limit=50&access_token=${token}`;

      while (nextUrl) {
        const res = await fetch(nextUrl);
        if (!res.ok) throw new Error((await res.json()).error?.message || 'Falha ao listar conversas.');
        const json = await res.json();
        let reachedOlder = false;
        for (const conv of json.data || []) {
          if (new Date(conv.updated_time).getTime() < thirtyDaysAgo) { reachedOlder = true; break; }
          conversationIds.push(conv.id);
        }
        nextUrl = reachedOlder ? null : (json.paging?.next || null);
      }

      const profileCache = {};
      let contactCount = 0;
      let msgCount = 0;

      for (const convId of conversationIds) {
        // Solicita o campo attachments para puxar imagens e áudios enviados nas mensagens
        const convRes = await fetch(`https://graph.instagram.com/${convId}?fields=messages.limit(50){message,created_time,from,to,attachments{id,mime_type,file_url,image_data,video_data}}&access_token=${token}`);
        if (!convRes.ok) continue;
        const convJson = await convRes.json();
        const convMessages = (convJson.messages?.data || []).filter(m => new Date(m.created_time).getTime() >= thirtyDaysAgo);
        if (convMessages.length === 0) continue;

        const other = convMessages
          .map(m => (m.from?.id && m.from.id !== myId) ? m.from : (m.to?.data || []).find(p => p.id !== myId))
          .find(Boolean);
        if (!other) continue;

        if (!profileCache[other.id]) {
          try {
            const profRes = await fetch(`https://graph.instagram.com/${other.id}?fields=name,username,profile_pic&access_token=${token}`);
            profileCache[other.id] = profRes.ok ? await profRes.json() : { username: other.username };
          } catch {
            profileCache[other.id] = { username: other.username };
          }
        }
        const profile = profileCache[other.id];

        const { data: existingContact } = await supabase
          .from('new_amoreja_ig_contacts')
          .select('id, profile_pic_url')
          .eq('instagram_id', other.id)
          .eq('owner_instagram_id', myId)
          .maybeSingle();

        let contactId = existingContact?.id;
        
        // Persiste a foto de perfil do contato no Supabase Storage para evitar erros 403 futuros
        let permanentProfilePic = existingContact?.profile_pic_url;
        if (profile.profile_pic && (!permanentProfilePic || permanentProfilePic.includes('instagram.com') || permanentProfilePic.includes('fbcdn.net'))) {
          permanentProfilePic = await persistMediaToStorage(profile.profile_pic, `profile_${other.id}`);
        }

        if (!contactId) {
          const { data: inserted, error: insErr } = await supabase
            .from('new_amoreja_ig_contacts')
            .insert([{
              instagram_id: other.id,
              owner_instagram_id: myId,
              username: profile.username || other.username,
              full_name: profile.name || profile.username || other.username,
              profile_pic_url: permanentProfilePic || null,
              approved: true
            }])
            .select()
            .single();
          if (insErr) throw insErr;
          contactId = inserted.id;
          contactCount++;
        } else if (permanentProfilePic && permanentProfilePic !== existingContact.profile_pic_url) {
          // Atualiza a foto de perfil para a URL local do Supabase
          await supabase.from('new_amoreja_ig_contacts').update({ profile_pic_url: permanentProfilePic }).eq('id', contactId);
        }

        let lastMsg = null;
        for (const m of convMessages.slice().reverse()) {
          const isFromMe = m.from?.id === myId;
          
          // Processa anexos de mídia da mensagem (imagens, áudio, etc.)
          const attachment = m.attachments?.data?.[0];
          let mediaUrl = null;
          let messageType = 'text';

          if (attachment) {
            // Obtém link temporário da mídia
            mediaUrl = attachment.image_data?.url || attachment.video_data?.url || attachment.file_url;
            if (attachment.mime_type?.includes('audio')) {
              messageType = 'audio';
            } else if (attachment.mime_type?.includes('image')) {
              messageType = 'image';
            } else if (attachment.mime_type?.includes('video')) {
              messageType = 'video';
            }
          }

          const content = m.message || (messageType === 'audio' ? '[Áudio]' : '[Mídia]');

          const { data: dup } = await supabase
            .from('new_amoreja_ig_messages')
            .select('id')
            .eq('contact_id', contactId)
            .eq('content', content)
            .eq('created_at', m.created_time)
            .maybeSingle();
          if (dup) continue;

          // Se a mensagem contém mídia, envia para o Supabase Storage de forma definitiva
          let permanentMediaUrl = null;
          if (mediaUrl) {
            permanentMediaUrl = await persistMediaToStorage(mediaUrl, `msg_${contactId}_${m.id || Date.now()}`);
          }

          await supabase.from('new_amoreja_ig_messages').insert([{
            contact_id: contactId,
            sender_username: isFromMe ? 'Você' : (profile.username || other.username),
            content,
            is_from_me: isFromMe,
            created_at: m.created_time,
            media_url: permanentMediaUrl,
            message_type: messageType
          }]);
          msgCount++;
          lastMsg = { content, isFromMe, time: m.created_time };
        }

        if (lastMsg) {
          await supabase.from('new_amoreja_ig_contacts').update({
            last_msg_preview: lastMsg.isFromMe ? `Você: ${lastMsg.content}` : lastMsg.content,
            last_msg_time: lastMsg.time
          }).eq('id', contactId);
        }
      }

      setSettingsMessage(`Conversas sincronizadas! ${contactCount} contato(s) novo(s), ${msgCount} mensagem(ns) importada(s) dos últimos 30 dias com mídias salvas.`);
      loadContacts();
    } catch (err) {
      console.error(err);
      setSettingsError('Erro ao sincronizar conversas: ' + err.message);
    } finally {
      setSyncingConversations(false);
    }
  };

  useEffect(() => {
    const tabContacts = contacts.filter(c => activeTab === 'inbox' ? c.approved : !c.approved);
    const filtered = tabContacts.filter(c =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      setActiveContactId(filtered[0].id);
    } else {
      setActiveContactId(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeContactId) {
      loadHistory(activeContactId);
      setIsAiMode(false);
      setInputMessage('');
      
      // Marcar como lido localmente
      setContacts(prev => prev.map(c => c.id === activeContactId ? { ...c, unread: false } : c));
      if (isSupabaseConfigured()) {
        supabase.from('new_amoreja_ig_contacts').update({ unread: false }).eq('id', activeContactId).then();
      }
    } else {
      setMessages([]);
      setAiMessages([]);
    }
  }, [activeContactId]);

  // Função para baixar imagens/áudios expirados da Meta e salvar permanentemente no Supabase Storage
  const persistMediaToStorage = async (url, bucketPath) => {
    if (!url || !isSupabaseConfigured()) return url;
    
    // Verifica se já é um link do Supabase Storage
    if (url.includes('supabase.co/storage')) return url;
    
    // Só processa URLs externas do Instagram / Facebook
    if (!url.includes('instagram.com') && !url.includes('fbcdn.net') && !url.includes('cdninstagram.com')) {
      return url;
    }

    try {
      // Faz o download silencioso do arquivo de mídia
      const res = await fetch(url);
      if (!res.ok) return url;
      const blob = await res.blob();
      
      // Obtém extensão
      const fileExt = url.split('?')[0].split('.').pop() || 'jpg';
      const fileName = `${bucketPath}_${Date.now()}.${fileExt}`;

      // Faz o upload no bucket instagram_media
      const { data, error } = await supabase.storage
        .from('instagram_media')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Obtém a URL pública permanente
      const { data: { publicUrl } } = supabase.storage
        .from('instagram_media')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (err) {
      console.warn('CORS ou erro de download ao persistir mídia no Storage, usando fallback URL:', err);
      return url;
    }
  };

  async function loadContacts(selectFirstId = null) {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      let query = supabase
        .from('new_amoreja_ig_contacts')
        .select('*');
      
      // Filtra os contatos pela conta do Instagram ativa selecionada, ou nulos (migrados)
      const currentOwnerId = localStorage.getItem('selected_ig_account_id');
      const active = instagramAccounts.find(a => a.id === currentOwnerId) || activeAccount;
      if (active?.instagram_user_id) {
        query = query.or(`owner_instagram_id.eq.${active.instagram_user_id},owner_instagram_id.is.null`);
      } else {
        // Se a conta ativa ainda não tem ID cadastrado (ex: apenas token) ou não há conta conectada, mostramos os nulos
        query = query.or('owner_instagram_id.is.null,owner_instagram_id.eq.none_selected');
      }

      const { data, error } = await query.order('last_msg_time', { ascending: false });
      if (error) throw error;
      
      setContacts(data || []);

      if (selectFirstId) {
        setActiveContactId(selectFirstId);
      } else if (data && data.length > 0 && !activeContactId) {
        // Seleciona a primeira conversa por padrão se houver
        setActiveContactId(data[0].id);
      } else if (!data || data.length === 0) {
        setActiveContactId(null);
      }
    } catch (e) {
      console.error('Erro ao carregar contatos IG:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications() {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('new_amoreja_ig_notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotifications(data || []);
    } catch (e) {
      console.error('Erro ao carregar notificações:', e);
    }
  }

  async function loadHistory(contactId) {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      // 1. Mensagens Direct
      const { data: msgData, error: msgErr } = await supabase
        .from('new_amoreja_ig_messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });
      if (msgErr) throw msgErr;
      setMessages(msgData || []);

      // Migração silenciosa de mídias antigas do Instagram no background
      if (msgData && msgData.length > 0) {
        msgData.forEach(async (msg) => {
          if (msg.media_url && (msg.media_url.includes('instagram.com') || msg.media_url.includes('fbcdn.net') || msg.media_url.includes('cdninstagram.com'))) {
            try {
              const permanentUrl = await persistMediaToStorage(msg.media_url, `msg_${contactId}_${msg.id}`);
              if (permanentUrl && permanentUrl !== msg.media_url) {
                // Atualiza no banco
                await supabase.from('new_amoreja_ig_messages').update({ media_url: permanentUrl }).eq('id', msg.id);
                // Atualiza o estado local para renderizar imediatamente
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, media_url: permanentUrl } : m));
              }
            } catch (err) {
              console.warn('Erro ao migrar mídia antiga em background:', err);
            }
          }
        });
      }

      // 2. Histórico da IA para esse contato
      const { data: aiData, error: aiErr } = await supabase
        .from('new_amoreja_ig_agent_chats')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });
      if (aiErr) throw aiErr;
      setAiMessages((aiData || []).map(m => ({ message: m.message, sender: m.sender, id: m.id })));
    } catch (e) {
      console.error('Erro ao carregar histórico IG:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleAcceptContact = async (contactId) => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('new_amoreja_ig_contacts')
        .update({ approved: true })
        .eq('id', contactId);
      if (error) throw error;
      
      setActiveTab('inbox');
      await loadContacts(contactId);
    } catch (e) {
      alert('Erro ao aceitar solicitação: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineContact = async (contactId) => {
    if (!window.confirm("Ignorar e remover esta solicitação de conversa?")) return;
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('new_amoreja_ig_contacts')
        .delete()
        .eq('id', contactId);
      if (error) throw error;
      await loadContacts();
    } catch (e) {
      alert('Erro ao recusar solicitação: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Cadastro de nova conta de Instagram
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountToken, setNewAccountToken] = useState('');
  const [newAccountUserId, setNewAccountUserId] = useState('');
  const [newAccountUsername, setNewAccountUsername] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccountName || !newAccountToken) {
      setSettingsError('Preencha o nome da conta e o token!');
      return;
    }
    setAddingAccount(true);
    setSettingsMessage('');
    setSettingsError('');

    try {
      let igUserId = newAccountUserId.trim();
      let igUsername = newAccountUsername.trim();

      // Se não preencheu o ID ou Username manualmente, tenta buscar via API
      if (!igUserId || !igUsername) {
        const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${newAccountToken}`);
        if (!meRes.ok) {
          // Se o usuário digitou o ID mas o Username falhou na API, ou vice-versa, e deu erro geral, levantamos o erro
          if (!igUserId) {
            throw new Error('Token inválido ou sem permissão para ler dados do perfil. Insira o ID e Username manualmente abaixo se preferir.');
          }
        } else {
          const meData = await meRes.json();
          if (!igUserId) igUserId = meData.id;
          if (!igUsername) igUsername = meData.username;
        }
      }

      // Busca a foto de perfil do próprio perfil do Instagram via Facebook Graph API
      let profilePicUrl = null;
      try {
        const picRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}?fields=profile_picture_url&access_token=${newAccountToken}`);
        if (picRes.ok) {
          const picData = await picRes.json();
          if (picData.profile_picture_url) {
            // Persiste no Supabase Storage
            profilePicUrl = await persistMediaToStorage(picData.profile_picture_url, `account_${igUserId}`);
          }
        }
      } catch (picErr) {
        console.warn('Não foi possível obter a foto de perfil da conta:', picErr);
      }

      // 2. Insere a conta no banco de dados
      const { error } = await supabase
        .from('new_amoreja_instagram_accounts')
        .insert([{
          account_name: newAccountName,
          instagram_username: igUsername || 'custom_profile',
          instagram_user_id: igUserId || 'custom_id',
          access_token: newAccountToken,
          profile_picture_url: profilePicUrl,
          is_active: true
        }]);

      if (error) throw error;

      setNewAccountName('');
      setNewAccountToken('');
      setNewAccountUserId('');
      setNewAccountUsername('');
      setSettingsMessage('Nova conta conectada com sucesso! 🎉');
      
      // Recarrega lista
      await loadInstagramAccounts();
    } catch (err) {
      console.error(err);
      setSettingsError('Erro ao adicionar conta: ' + err.message);
    } finally {
      setAddingAccount(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Deseja realmente remover esta conta do Instagram? Todas as conversas locais associadas a ela deixarão de aparecer.')) return;
    try {
      const { error } = await supabase
        .from('new_amoreja_instagram_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      setSettingsMessage('Conta removida com sucesso!');
      
      await loadInstagramAccounts();
    } catch (err) {
      setSettingsError('Erro ao deletar conta: ' + err.message);
    }
  };

  // Edição de conta existente
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [editAccountToken, setEditAccountToken] = useState('');
  const [editAccountUserId, setEditAccountUserId] = useState('');
  const [editAccountUsername, setEditAccountUsername] = useState('');

  const startEditingAccount = (acc) => {
    setEditingAccountId(acc.id);
    setEditAccountName(acc.account_name || '');
    setEditAccountToken(acc.access_token || '');
    setEditAccountUserId(acc.instagram_user_id || '');
    setEditAccountUsername(acc.instagram_username || '');
  };

  const handleSaveEditAccount = async (e) => {
    e.preventDefault();
    if (!editAccountName || !editAccountToken) {
      setSettingsError('O nome da conta e o token de acesso não podem ficar em branco.');
      return;
    }

    setSettingsMessage('');
    setSettingsError('');

    try {
      const { error } = await supabase
        .from('new_amoreja_instagram_accounts')
        .update({
          account_name: editAccountName,
          access_token: editAccountToken,
          instagram_user_id: editAccountUserId,
          instagram_username: editAccountUsername
        })
        .eq('id', editingAccountId);

      if (error) throw error;

      setSettingsMessage('Conta atualizada com sucesso! 🎉');
      setEditingAccountId(null);

      // Recarrega as contas
      await loadInstagramAccounts();
    } catch (err) {
      console.error(err);
      setSettingsError('Erro ao editar conta: ' + err.message);
    }
  };

  const handleSendDm = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeContactId || sending) return;
    const contact = contacts.find(c => c.id === activeContactId);
    if (!contact) return;

    if (!contact.approved) {
      alert('Aceite a solicitação de conversa primeiro para poder responder.');
      return;
    }

    const userText = inputMessage;
    setInputMessage('');
    setSending(true);

    const tempId = Date.now().toString();
    const tempMsg = {
      id: tempId,
      contact_id: activeContactId,
      sender_username: 'Você',
      content: userText,
      is_from_me: true,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    setContacts(prev => prev.map(c => c.id === activeContactId ? {
      ...c,
      last_msg_preview: `Você: ${userText}`,
      last_msg_time: new Date().toISOString()
    } : c));

    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.functions.invoke('instagram-send', {
          body: { contact_id: activeContactId, text: userText }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        if (data.metaDeliveryFailed) {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, deliveryWarning: true } : m));
        }
      }
    } catch (err) {
      console.error('Erro ao enviar DM:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInputMessage(userText);
      alert('Não foi possível salvar sua mensagem. Verifique sua conexão e tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleSendAi = async (userMessage) => {
    const contact = contacts.find(c => c.id === activeContactId);
    if (!contact) return;

    const userMsgId = Date.now().toString();
    setAiMessages(prev => [...prev, { message: userMessage, sender: 'admin', id: userMsgId }]);
    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        await supabase.from('new_amoreja_ig_agent_chats').insert([{
          contact_id: activeContactId,
          message: userMessage,
          sender: 'admin'
        }]);
      }
    } catch (e) { console.warn('Erro ao salvar msg admin:', e); }

    try {
      const ctx = messages.slice(-40).map(m =>
        `[${new Date(m.created_at).toLocaleTimeString()}] ${m.is_from_me ? 'Você' : contact.full_name || contact.username}: ${m.content}`
      ).join('\n');

      if (!ctx.trim()) {
        setAiMessages(prev => [...prev, { message: '⚠️ Sem mensagens no Direct para analisar.', sender: 'ai', id: 'err_' + Date.now() }]);
        setLoading(false);
        return;
      }

      const sys = `Você é o Agente IA da Amoreja no Instagram. Responda perguntas sobre a conversa direta com o usuário "${contact.full_name || contact.username}":\n---\n${ctx}\n---`;
      
      const history = aiMessages
        .filter(m => {
          if (!m.message || !m.message.trim()) return false;
          if (m.id?.startsWith('_sys_')) return false;
          if (m.id === 'err' || m.id?.startsWith('err_')) return false;
          if (m.message.startsWith('❌') || m.message.startsWith('⚠️') || m.message.startsWith('⏳') || m.message.startsWith('🤖')) return false;
          if (m.id === userMsgId) return false;
          return true;
        })
        .map(m => ({ role: m.sender === 'admin' ? 'user' : 'model', parts: [{ text: m.message }] }));

      while (history.length > 0 && history[history.length - 1].role === 'user') {
        history.pop();
      }

      const isRateLimit = (msg) => {
        if (!msg) return false;
        const lower = msg.toLowerCase();
        return lower.includes('429') || lower.includes('503') || lower.includes('resource_exhausted')
          || lower.includes('quota') || lower.includes('rate limit') || lower.includes('too many');
      };

      let success = false;
      for (const modelName of AI_MODELS) {
        try {
          setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
            { message: `🤖 Usando ${modelName}...`, sender: 'ai', id: '_sys_info' }]);

          const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: sys });
          const chat = model.startChat({ history });
          const result = await chat.sendMessage(userMessage);
          const reply = result.response.text();

          setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
            { message: reply, sender: 'ai', id: (Date.now() + 1).toString() }]);

          if (isSupabaseConfigured()) {
            await supabase.from('new_amoreja_ig_agent_chats').insert([{
              contact_id: activeContactId,
              message: reply,
              sender: 'ai'
            }]);
          }
          success = true;
          break;
        } catch (err) {
          console.warn(`[IA IG] ${modelName} falhou:`, err.message?.substring(0, 150));
          if (isRateLimit(err.message)) {
            setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
              { message: `⏳ ${modelName} em limite. Tentando próximo...`, sender: 'ai', id: '_sys_retry' }]);
            await new Promise(r => setTimeout(r, 1500));
            continue;
          }
          setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
            { message: `❌ ${modelName}: ${err.message?.split('\n')[0] || 'Erro'}`, sender: 'ai', id: 'err_' + Date.now() }]);
          setLoading(false);
          return;
        }
      }

      if (!success) {
        setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
          { message: '⚠️ Limite excedido na IA. Tente novamente em 30 segundos.', sender: 'ai', id: 'err_' + Date.now() }]);
      }
    } catch (err) {
      console.error('[IA IG] Erro:', err);
      setAiMessages(prev => [...prev.filter(x => !x.id?.startsWith('_sys_')),
        { message: `❌ Erro inesperado: ${err.message?.split('\n')[0]}`, sender: 'ai', id: 'err_' + Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (notifId, currentVal) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_following: !currentVal } : n));
  };

  // Filtragem de dados dependendo da aba ativa
  const getSidebarList = () => {
    const tabContacts = contacts.filter(c => activeTab === 'inbox' ? c.approved : !c.approved);
    return tabContacts.filter(c =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredItems = getSidebarList();
  const activeContact = contacts.find(c => c.id === activeContactId);

  const filteredNotifications = notifications.filter(n => {
    if (notificationFilter === 'follows') return n.type === 'follow';
    if (notificationFilter === 'likes') return n.type === 'like_post' || n.type === 'like_reel';
    return true;
  });

  const pendingRequestsCount = contacts.filter(c => !c.approved).length;
  const unreadMessagesCount = contacts.filter(c => c.approved && c.unread).length;

  return (
    <div className="instagram-hub-container">
      {/* ── TOPO: SELETOR DE CONTA E ABAS ── */}
      <div className="ig-hub-header">
        <div className="ig-hub-brand">
          <InstagramIcon size={24} className="ig-pink" />
          <h2>Central Instagram</h2>
        </div>

        {/* Abas Principais */}
        <div className="ig-hub-tabs">
          <button 
            className={`ig-hub-tab ${mainActiveTab === 'direct' ? 'active' : ''}`}
            onClick={() => setMainActiveTab('direct')}
          >
            <MessageCircle size={16} /> Direct (Chat)
          </button>
          <button 
            className={`ig-hub-tab ${mainActiveTab === 'ai' ? 'active' : ''}`}
            onClick={() => setMainActiveTab('ai')}
          >
            <Sparkles size={16} /> Gerador de IA
          </button>
          <button 
            className={`ig-hub-tab ${mainActiveTab === 'accounts' ? 'active' : ''}`}
            onClick={() => setMainActiveTab('accounts')}
          >
            <Users size={16} /> Contas Conectadas
          </button>
        </div>

        {/* Seletor de Conta Instagram Ativa */}
        <div className="ig-hub-account-selector" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activeAccount && (
            activeAccount.profile_picture_url && !accountImageErrors[activeAccount.id] ? (
              <img 
                src={activeAccount.profile_picture_url} 
                alt="" 
                className="ig-avatar" 
                style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1' }}
                onError={() => setAccountImageErrors(prev => ({ ...prev, [activeAccount.id]: true }))}
              />
            ) : (
              <div className="ig-avatar-fallback" style={{ width: '28px', height: '28px', fontSize: '0.65rem' }}>
                {(activeAccount.instagram_username || activeAccount.account_name || 'IG').substring(0, 2).toUpperCase()}
              </div>
            )
          )}
          <span className="selector-label">Gerenciando:</span>
          {instagramAccounts.length === 0 ? (
            <span className="no-accounts-warning">Nenhuma conta cadastrada</span>
          ) : (
            <select 
              value={selectedAccountId} 
              onChange={e => handleAccountChange(e.target.value)}
              className="ig-account-dropdown"
            >
              {instagramAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} (@{acc.instagram_username || 'carregando...'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {settingsMessage && (
        <div className="hub-alert-toast success">
          <CheckCircle size={16} /> <span>{settingsMessage}</span>
          <button onClick={() => setSettingsMessage('')} className="close-alert-btn">×</button>
        </div>
      )}
      {settingsError && (
        <div className="hub-alert-toast error">
          <ShieldAlert size={16} /> <span>{settingsError}</span>
          <button onClick={() => setSettingsError('')} className="close-alert-btn">×</button>
        </div>
      )}

      {/* ── CONTEÚDO DINÂMICO DE ACORDO COM A ABA SELECIONADA ── */}
      <div className="ig-hub-content">
        
        {/* ABA 1: DIRECT (CHAT) */}
        {mainActiveTab === 'direct' && (
          <div className="ig-web-layout">
            {/* Sidebar de conversas */}
            <div className="ig-sidebar">
              <div className="ig-sidebar-header">
                <span className="sidebar-section-title">Conversas Ativas</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)} 
                    className={`ig-icon-btn ${showNotifications ? 'active-bell' : ''}`}
                    title="Notificações"
                  >
                    <Heart size={18} className={showNotifications ? 'ig-pink-fill' : ''} />
                  </button>
                  <button onClick={() => loadContacts()} className="ig-icon-btn" title="Recarregar Contatos">
                    <RefreshCw size={16} color="#262626" />
                  </button>
                </div>
              </div>

              {/* Conexão da conta atual */}
              <div className={`ig-connection-badge ${isTokenValid(igToken) ? 'connected' : 'disconnected'}`}>
                <span className="ig-connection-dot" />
                {isTokenValid(igToken) ? `Conectado como @${activeAccount?.instagram_username || 'Instagram'}` : 'Não conectado'}
              </div>

              {/* Sub-abas do Direct */}
              <div className="ig-tabs-container">
                <button 
                  className={`ig-tab ${activeTab === 'inbox' ? 'active' : ''}`}
                  onClick={() => setActiveTab('inbox')}
                >
                  Mensagens
                  {unreadMessagesCount > 0 && <span className="ig-badge-unread">{unreadMessagesCount}</span>}
                </button>
                <button 
                  className={`ig-tab ${activeTab === 'requests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('requests')}
                >
                  Solicitações
                  {pendingRequestsCount > 0 && <span className="ig-badge">{pendingRequestsCount}</span>}
                </button>
              </div>

              <div className="ig-search-bar">
                <div className="ig-search-input-wrapper">
                  <Search size={14} color="#8e8e8e" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                </div>
              </div>

              <div className="ig-contact-list">
                {filteredItems.length === 0 ? (
                  <div className="ig-empty-list">
                    {activeTab === 'inbox' && 'Nenhuma conversa ativa'}
                    {activeTab === 'requests' && 'Nenhuma solicitação'}
                  </div>
                ) : (
                  filteredItems.map(c => (
                    <div 
                      key={c.id} 
                      className={`ig-contact-item ${activeContactId === c.id ? 'active' : ''}`}
                      onClick={() => setActiveContactId(c.id)}
                    >
                      <div style={{ position: 'relative' }}>
                        {c.profile_pic_url && !contactImageErrors[c.id] ? (
                          <img 
                            src={c.profile_pic_url} 
                            alt={c.username} 
                            className="ig-avatar" 
                            onError={() => setContactImageErrors(prev => ({ ...prev, [c.id]: true }))}
                          />
                        ) : (
                          <div className="ig-avatar-fallback">
                            {(c.username || 'IG').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        {c.unread && <span className="ig-unread-badge-mobile" />}
                      </div>
                      <div className="ig-contact-info">
                        <div className="ig-contact-name-row">
                          <span className="ig-username">
                            {c.username}
                            {c.is_verified && <BadgeCheck size={14} className="verified-blue" />}
                          </span>
                          {c.last_msg_time && (
                            <span className="ig-msg-time">{formatTimeAgo(c.last_msg_time)}</span>
                          )}
                        </div>
                        <span className={`ig-fullname ${c.unread ? 'unread-bold' : ''}`}>
                          {c.last_msg_preview || c.full_name}
                        </span>
                      </div>
                      {c.unread && <span className="ig-unread-dot" />}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Painel do Chat Ativo */}
            <div className="ig-main">
              {activeContact ? (
                <>
                  {/* Header */}
                  <div className="ig-chat-header">
                    {activeContact.profile_pic_url && !contactImageErrors[activeContact.id] ? (
                      <img 
                        src={activeContact.profile_pic_url} 
                        alt={activeContact.username} 
                        className="ig-avatar" 
                        onError={() => setContactImageErrors(prev => ({ ...prev, [activeContact.id]: true }))}
                      />
                    ) : (
                      <div className="ig-avatar-fallback">
                        {(activeContact.username || 'IG').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="ig-chat-header-info">
                      <span className="ig-chat-header-name">
                        {activeContact.full_name || activeContact.username}
                        {activeContact.is_verified && <BadgeCheck size={15} className="verified-blue" />}
                      </span>
                      <span className="ig-chat-header-sub">@{activeContact.username}</span>
                    </div>
                    <div className="ig-header-actions">
                      <button 
                        className={`ig-icon-btn ${isAiMode ? 'ai-active' : ''}`} 
                        onClick={() => setIsAiMode(!isAiMode)} 
                        title="Análise com IA"
                      >
                        <Bot size={22} color={isAiMode ? '#e1306c' : '#262626'} />
                      </button>
                    </div>
                  </div>

                  {/* Banner de Solicitação */}
                  {!activeContact.approved && (
                    <div className="ig-request-banner">
                      <div className="ig-request-banner-info">
                        <ShieldAlert size={20} color="#e1306c" />
                        <div>
                          <h4>Solicitação de mensagem pendente</h4>
                          <p>Deseja responder a @{activeContact.username}? Aceite a conversa para enviar mídias e responder.</p>
                        </div>
                      </div>
                      <div className="ig-request-actions">
                        <button onClick={() => handleAcceptContact(activeContact.id)} className="ig-req-btn ig-req-accept">Aceitar Conversa</button>
                        <button onClick={() => handleDeclineContact(activeContact.id)} className="ig-req-btn ig-req-decline">Recusar</button>
                      </div>
                    </div>
                  )}

                  {/* Mensagens do chat */}
                  <div className="ig-chat-body">
                    {messages.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: '#8e8e8e', flex: 1 }}>
                        Nenhuma mensagem anterior sincronizada. Use "Importar Conversas" para ler o histórico recente da Meta.
                      </div>
                    ) : (
                      (() => {
                        let lastDateStr = '';
                        return messages.map(msg => {
                          const dateObj = new Date(msg.created_at);
                          const dateStr = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
                          const showDateHeader = dateStr !== lastDateStr;
                          lastDateStr = dateStr;

                          const formattedDate = dateObj.toLocaleDateString('pt-BR');
                          const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                          return (
                            <React.Fragment key={msg.id}>
                              {showDateHeader && (
                                <div className="ig-chat-date-header">
                                  <span>{dateStr}</span>
                                </div>
                              )}
                              <div className={`ig-bubble-row ${msg.is_from_me ? 'ig-out' : 'ig-in'}`}>
                                <div className="ig-bubble">
                                  {(() => {
                                    const isAudio = msg.message_type === 'audio' || 
                                                    msg.content === '[Áudio]' || 
                                                    msg.content?.toLowerCase().includes('[áudio]') ||
                                                    msg.content?.toLowerCase().includes('[audio]') ||
                                                    msg.media_url?.includes('.mp4') ||
                                                    msg.media_url?.includes('.m4a');
                                    
                                    if (isAudio && msg.media_url) {
                                      return (
                                        <div className="ig-media-container audio" style={{ padding: '6px' }}>
                                          <audio 
                                            controls 
                                            src={msg.media_url} 
                                            style={{ display: 'block', maxWidth: '240px' }} 
                                          />
                                        </div>
                                      );
                                    }

                                    if (msg.media_url) {
                                      if (mediaErrors[msg.id]) {
                                        return (
                                          <div 
                                            className="ig-bubble-text expired-media-box" 
                                            style={{ 
                                              display: 'flex', 
                                              flexDirection: 'column', 
                                              gap: '6px', 
                                              fontSize: '0.8rem', 
                                              color: '#7a7a7a', 
                                              background: '#f1f5f9', 
                                              padding: '12px', 
                                              borderRadius: '10px',
                                              border: '1px dashed #cbd5e1' 
                                            }}
                                          >
                                            <span style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              🖼️ Mídia expirada do Instagram
                                            </span>
                                            <span style={{ fontSize: '0.72rem' }}>O link temporário fornecido pela Meta expirou.</span>
                                            <a 
                                              href={msg.media_url} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              style={{ color: '#9B51E0', textDecoration: 'underline', fontSize: '0.72rem', fontWeight: '700' }}
                                            >
                                              Tentar abrir original
                                            </a>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div className="ig-bubble-media">
                                          <img 
                                            src={msg.media_url} 
                                            alt="Direct Media" 
                                            className="ig-chat-image" 
                                            onError={() => {
                                              setMediaErrors(prev => ({ ...prev, [msg.id]: true }));
                                            }}
                                            onClick={() => window.open(msg.media_url, '_blank')} 
                                            style={{ cursor: 'pointer', borderRadius: '12px', maxWidth: '240px', display: 'block' }}
                                          />
                                        </div>
                                      );
                                    }

                                    return <div className="ig-bubble-text">{msg.content}</div>;
                                  })()}
                                </div>
                                <span className="ig-bubble-time-stamp">
                                  {formattedDate} - {formattedTime}
                                  {msg.deliveryWarning && (
                                    <span className="ig-delivery-warning" title="Envio pendente na API"> ⚠️ falha</span>
                                  )}
                                </span>
                              </div>
                            </React.Fragment>
                          );
                        });
                      })()
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Footer */}
                  <div className="ig-chat-footer">
                    <form onSubmit={isAiMode ? (e) => { e.preventDefault(); if (inputMessage.trim()) { handleSendAi(inputMessage); setInputMessage(''); } } : handleSendDm} className="ig-input-form">
                      <input 
                        type="text" 
                        className="ig-chat-input"
                        placeholder={
                          !activeContact.approved 
                            ? "Aceite a solicitação acima para responder..." 
                            : isAiMode 
                              ? `Perguntar à IA sobre @${activeContact.username}...` 
                              : "Enviar mensagem..."
                        }
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        disabled={loading || !activeContact.approved}
                      />
                      <button type="submit" className="ig-send-btn" disabled={!inputMessage.trim() || loading || !activeContact.approved}>
                        <Send size={18} />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="ig-empty-state">
                  <MessageCircle size={60} color="#dbdbdb" />
                  <h2>Mensagens do Direct</h2>
                  <p>Selecione um contato na lista lateral para iniciar a conversa.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 2: GERADOR DE POSTS (InstagramAI) */}
        {mainActiveTab === 'ai' && (
          <div className="hub-ai-tab-wrapper">
            <InstagramAI activeAccount={activeAccount} />
          </div>
        )}

        {/* ABA 3: GERENCIAR CONTAS CONECTADAS */}
        {mainActiveTab === 'accounts' && (
          <div className="hub-accounts-tab-wrapper">
            <div className="accounts-sidebar-grid">
              
              {/* Formulário de Nova Conta */}
              <div className="ai-card">
                <div className="card-header"><Plus size={18} /><h3>Conectar Nova Conta</h3></div>
                <p className="card-desc">Adicione um novo Access Token de longa duração do Facebook Developers para gerenciar as mensagens e posts.</p>
                
                <form onSubmit={handleAddAccount} className="prompt-form">
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Identificação / Apelido da Conta</label>
                    <input
                      type="text"
                      placeholder="Ex: Amoreja Oficial"
                      value={newAccountName}
                      onChange={e => setNewAccountName(e.target.value)}
                      className="inspirations-input"
                      required
                    />
                  </div>
                  
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">Access Token do Instagram (Long-Lived)</label>
                    <textarea
                      placeholder="Insira o Access Token gerado no Graph API Explorer..."
                      value={newAccountToken}
                      onChange={e => setNewAccountToken(e.target.value)}
                      className="form-control font-mono font-12"
                      rows="3"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">ID da Conta do Instagram (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Se deixado em branco, tentaremos obter via API..."
                      value={newAccountUserId}
                      onChange={e => setNewAccountUserId(e.target.value)}
                      className="inspirations-input"
                    />
                    <span className="input-hint font-10">Recomendado se o token não tiver permissão completa de leitura de perfil.</span>
                  </div>

                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label">Username do Instagram (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: amoreja.amigurumi"
                      value={newAccountUsername}
                      onChange={e => setNewAccountUsername(e.target.value)}
                      className="inspirations-input"
                    />
                  </div>

                  <button type="submit" className="btn-generate" disabled={addingAccount}>
                    {addingAccount ? 'Conectando...' : 'Conectar Conta do Instagram'}
                  </button>
                </form>
              </div>

              {/* Lista de Contas Cadastradas */}
              <div className="ai-card" style={{ flex: 1 }}>
                <div className="card-header"><h3>Contas de Instagram Ativas ({instagramAccounts.length})</h3></div>
                
                {instagramAccounts.length === 0 ? (
                  <div className="library-empty">
                    <Bot size={40} />
                    <p>Nenhuma conta do Instagram conectada ainda.</p>
                    <span>Preencha o formulário ao lado para adicionar o seu perfil do Instagram.</span>
                  </div>
                ) : (
                  <div className="accounts-list-grid">
                    {instagramAccounts.map(acc => (
                      <div key={acc.id} className="instagram-account-card">
                        {editingAccountId === acc.id ? (
                          /* FORMULÁRIO DE EDIÇÃO INLINE */
                          <form onSubmit={handleSaveEditAccount} className="prompt-form" style={{ gap: '10px', display: 'flex', flexDirection: 'column' }}>
                            <div className="card-header" style={{ paddingBottom: '4px', marginBottom: '4px' }}>
                              <h4>Editar Conta</h4>
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Apelido da Conta</label>
                              <input 
                                type="text" 
                                value={editAccountName} 
                                onChange={e => setEditAccountName(e.target.value)}
                                className="inspirations-input"
                                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Access Token</label>
                              <textarea 
                                value={editAccountToken} 
                                onChange={e => setEditAccountToken(e.target.value)}
                                className="form-control font-mono font-11"
                                rows="3"
                                required
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>ID do Instagram</label>
                              <input 
                                type="text" 
                                value={editAccountUserId} 
                                onChange={e => setEditAccountUserId(e.target.value)}
                                className="inspirations-input"
                                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div className="form-group">
                              <label className="form-label" style={{ fontSize: '0.75rem' }}>Username</label>
                              <input 
                                type="text" 
                                value={editAccountUsername} 
                                onChange={e => setEditAccountUsername(e.target.value)}
                                className="inspirations-input"
                                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                              />
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                              <button type="submit" className="lib-btn lib-btn-save" style={{ flex: 1, padding: '6px', fontSize: '0.8rem' }}>Salvar</button>
                              <button type="button" onClick={() => setEditingAccountId(null)} className="lib-btn" style={{ flex: 1, padding: '6px', fontSize: '0.8rem', background: '#e2e8f0', color: '#475569' }}>Cancelar</button>
                            </div>
                          </form>
                        ) : (
                          /* CARD DE EXIBIÇÃO TRADICIONAL */
                          <>
                            <div className="acc-card-header" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              {acc.profile_picture_url && !accountImageErrors[acc.id] ? (
                                <img 
                                  src={acc.profile_picture_url} 
                                  alt="" 
                                  className="ig-avatar" 
                                  style={{ width: '75px', height: '75px', border: '2px solid #cbd5e1' }}
                                  onError={() => setAccountImageErrors(prev => ({ ...prev, [acc.id]: true }))}
                                />
                              ) : (
                                <div className="ig-avatar-fallback" style={{ width: '75px', height: '75px', fontSize: '1.5rem', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                  {(acc.instagram_username || acc.account_name || 'IG').substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.account_name}</h4>
                                <span className="acc-username" style={{ fontSize: '0.75rem' }}>@{acc.instagram_username || 'desconhecido'}</span>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button 
                                  onClick={() => startEditingAccount(acc)} 
                                  className="ig-icon-btn"
                                  style={{ padding: '4px' }}
                                  title="Editar conta"
                                >
                                  <Settings size={15} color="#475569" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteAccount(acc.id)} 
                                  className="lib-delete-btn"
                                  title="Remover conta"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>

                            <div className="acc-details-list">
                              <div className="acc-detail-item">
                                <strong>Instagram ID:</strong> <span>{acc.instagram_user_id || 'Não identificado'}</span>
                              </div>
                              <div className="acc-detail-item">
                                <strong>Verify Token:</strong> <code className="acc-code">{acc.verify_token}</code>
                              </div>
                              <div className="acc-detail-item">
                                <strong>URL do Webhook:</strong>
                                <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '4px' }}>
                                  <input 
                                    type="text" 
                                    readOnly 
                                    value={`https://supabase-supabaseamoreja.1cnep6.easypanel.host/functions/v1/instagram-webhook`}
                                    className="form-control font-mono font-11"
                                    style={{ flex: 1, padding: '4px 8px' }}
                                  />
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(`https://supabase-supabaseamoreja.1cnep6.easypanel.host/functions/v1/instagram-webhook`);
                                    }}
                                    className="lib-btn lib-btn-save"
                                    style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem' }}
                                  >
                                    Copiar
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Ações de Sincronismo da Conta */}
                            <div className="acc-sync-actions">
                              <button 
                                onClick={handleSyncFeed} 
                                disabled={syncing}
                                className="lib-btn lib-btn-save"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                <RefreshCw size={12} className={syncing ? 'spinning' : ''} /> Feed
                              </button>
                              <button 
                                onClick={handleSyncConversations} 
                                disabled={syncingConversations}
                                className="lib-btn lib-btn-post"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                <MessageCircle size={12} className={syncingConversations ? 'spinning' : ''} /> Conversas
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ── DRAWER DE NOTIFICAÇÕES (RIGHT SIDEBAR) ── */}
      {showNotifications && (
        <div className="ig-notif-drawer">
          <div className="ig-notif-header">
            <h3>Notificações</h3>
            <button onClick={() => setShowNotifications(false)} className="ig-close-notif-btn">
              <X size={18} />
            </button>
          </div>

          <div className="ig-notif-filters">
            <button 
              className={`ig-notif-filter-btn ${notificationFilter === 'all' ? 'active' : ''}`}
              onClick={() => setNotificationFilter('all')}
            >
              Tudo
            </button>
            <button 
              className={`ig-notif-filter-btn ${notificationFilter === 'follows' ? 'active' : ''}`}
              onClick={() => setNotificationFilter('follows')}
            >
              Seguidores
            </button>
            <button 
              className={`ig-notif-filter-btn ${notificationFilter === 'likes' ? 'active' : ''}`}
              onClick={() => setNotificationFilter('likes')}
            >
              Curtidas
            </button>
          </div>

          <div className="ig-notif-list">
            {filteredNotifications.length === 0 ? (
              <div className="ig-notif-empty">Nenhuma notificação recente.</div>
            ) : (
              filteredNotifications.map(n => (
                <div key={n.id} className="ig-notif-item">
                  <img src={n.user_avatar} alt={n.username} className="ig-notif-avatar" />
                  <div className="ig-notif-content">
                    <p className="ig-notif-text">
                      <span className="ig-notif-username">{n.username}</span>{' '}
                      {n.type === 'follow' ? 'começou a seguir você.' : n.extra_text || 'curtiu seu post.'}
                      <span className="ig-notif-time"> {formatTimeAgo(n.created_at)}</span>
                    </p>
                  </div>
                  <div className="ig-notif-action-area">
                    {n.type === 'follow' && (
                      <button 
                        onClick={() => toggleFollow(n.id, n.is_following)}
                        className={`ig-notif-action-btn ${n.is_following ? 'following' : 'follow'}`}
                      >
                        {n.is_following ? <><UserCheck size={12} /> Seguindo</> : <><UserPlus size={12} /> Seguir de volta</>}
                      </button>
                    )}
                    {(n.type === 'like_post' || n.type === 'like_reel') && n.post_thumbnail && (
                      <img src={n.post_thumbnail} alt="Post" className="ig-notif-post-thumb" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
