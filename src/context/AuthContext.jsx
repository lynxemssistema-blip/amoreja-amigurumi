import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Inicialização síncrona a partir do cache local para carregamento instantâneo (0ms)
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('amoreja_auth_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState(() => {
    try {
      const cached = localStorage.getItem('amoreja_auth_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Se já temos perfil ou usuário em cache, não bloqueamos a interface com loading
  const [loading, setLoading] = useState(() => {
    try {
      const cachedProf = localStorage.getItem('amoreja_auth_profile');
      const cachedUsr = localStorage.getItem('amoreja_auth_user');
      if (cachedProf || cachedUsr) return false;
    } catch {}
    return true;
  });

  const [isDemoMode, setIsDemoMode] = useState(false);

  // Helper para identificar administradores mestres
  const isMasterUserEmail = (emailStr) => {
    if (!emailStr) return false;
    const em = emailStr.toLowerCase().trim();
    return (
      em.includes('edsonmanoel') ||
      em.includes('edsonmaneol') ||
      em.startsWith('admin@amoreja')
    );
  };

  // Carrega e observa o estado de autenticação
  useEffect(() => {
    // Timeout de segurança máximo de 2 segundos para nunca travar a aplicação
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    if (!isSupabaseConfigured()) {
      console.warn("Supabase não configurado. Entrando em Modo Demo (Simulado).");
      setIsDemoMode(true);
      clearTimeout(safetyTimer);
      
      const demoUser = {
        id: 'demo-user-id',
        email: 'admin@amoreja.com.br',
        user_metadata: { full_name: 'Marcia Reggiani (Demo)' }
      };
      const demoProfile = {
        id: 'demo-user-id',
        email: 'admin@amoreja.com.br',
        full_name: 'Marcia Reggiani (Demo)',
        is_admin: true,
        role: 'admin'
      };
      
      const storedUser = localStorage.getItem('demo_user');
      const storedProfile = localStorage.getItem('demo_profile');
      if (storedUser && storedProfile) {
        setUser(JSON.parse(storedUser));
        setProfile(JSON.parse(storedProfile));
      } else {
        setUser(demoUser);
        setProfile(demoProfile);
        localStorage.setItem('demo_user', JSON.stringify(demoUser));
        localStorage.setItem('demo_profile', JSON.stringify(demoProfile));
      }
      setLoading(false);
      return;
    }

    // Configuração com Supabase real
    let isMounted = true;

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user && isMounted) {
          setUser(session.user);
          localStorage.setItem('amoreja_auth_user', JSON.stringify(session.user));
          await fetchProfile(session.user.id, session.user.email);
        } else if (!session && isMounted) {
          // Se não há sessão ativa, limpa caches
          setUser(null);
          setProfile(null);
          localStorage.removeItem('amoreja_auth_user');
          localStorage.removeItem('amoreja_auth_profile');
        }
      } catch (err) {
        console.error("Erro ao obter sessão:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(safetyTimer);
        }
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session && session.user) {
        setUser(session.user);
        localStorage.setItem('amoreja_auth_user', JSON.stringify(session.user));
        await fetchProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('amoreja_auth_user');
        localStorage.removeItem('amoreja_auth_profile');
      }
      setLoading(false);
      clearTimeout(safetyTimer);
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription?.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId, userEmail) => {
    try {
      const emailToCheck = (userEmail || user?.email || '').toLowerCase().trim();
      const isMaster = isMasterUserEmail(emailToCheck);

      const { data, error } = await supabase
        .from('new_amoreja_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      let profileData = data || { id: userId, is_admin: false, role: 'client', user_tags: [] };

      // Se for o Super Admin Edson Manoel ou admin oficial, garante todas as permissões
      if (isMaster || profileData?.is_admin === true || profileData?.role === 'admin') {
        profileData = {
          ...profileData,
          email: profileData.email || emailToCheck || 'edsonmanoel2012@gmail.com',
          full_name: profileData.full_name || 'Edson Manoel (Super Admin)',
          is_admin: true,
          role: 'admin',
          partner_status: 'approved',
          user_tags: Array.from(new Set([...(profileData.user_tags || []), 'admin', 'master', 'colunista', 'maratonista', 'parceira']))
        };
      }

      // Fallback em new_amoreja_settings apenas se não for admin
      if (!isMaster && profileData.role === 'partner') {
        try {
          const { data: partnerSetting } = await supabase
            .from('new_amoreja_settings')
            .select('value')
            .eq('key', `partner_cfg_${userId}`)
            .maybeSingle();
          
          if (partnerSetting && partnerSetting.value) {
            const parsedPartner = JSON.parse(partnerSetting.value);
            profileData = { ...profileData, ...parsedPartner };
          }
        } catch (_) {}
      }

      setProfile(profileData);
      localStorage.setItem('amoreja_auth_profile', JSON.stringify(profileData));
    } catch (err) {
      console.error("Erro ao buscar perfil do banco:", err.message);
      const emailToCheck = (userEmail || user?.email || '').toLowerCase().trim();
      if (isMasterUserEmail(emailToCheck)) {
        const fallbackAdmin = {
          id: userId,
          email: emailToCheck,
          full_name: 'Edson Manoel (Super Admin)',
          is_admin: true,
          role: 'admin',
          partner_status: 'approved',
          user_tags: ['admin', 'master', 'colunista', 'maratonista', 'parceira']
        };
        setProfile(fallbackAdmin);
        localStorage.setItem('amoreja_auth_profile', JSON.stringify(fallbackAdmin));
      } else {
        setProfile({ id: userId, is_admin: false, role: 'client', user_tags: [] });
      }
    }
  };

  const updateProfile = async (updates) => {
    if (isDemoMode) {
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      localStorage.setItem('demo_profile', JSON.stringify(updatedProfile));
      return { data: updatedProfile, error: null };
    }

    try {
      // 1. Tenta atualizar diretamente na tabela new_amoreja_profiles
      const { data, error } = await supabase
        .from('new_amoreja_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        // Fallback: se colunas específicas de parceira não existirem ainda
        await supabase.from('new_amoreja_settings').upsert({
          key: `partner_cfg_${user.id}`,
          value: JSON.stringify(updates)
        }, { onConflict: 'key' });

        const merged = { ...profile, ...updates };
        setProfile(merged);
        return { data: merged, error: null };
      }

      setProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error.message);
      return { data: null, error };
    }
  };

  // Funções de Autenticação (Reais vs Simulado)
  const signIn = async (email, password) => {
    if (isDemoMode) {
      // Simulação de login
      if (email.includes('admin')) {
        const adminUser = { id: 'demo-user-id', email, user_metadata: { full_name: 'Marcia Reggiani (Demo)' } };
        const adminProfile = { id: 'demo-user-id', email, full_name: 'Marcia Reggiani (Demo)', is_admin: true, role: 'admin' };
        setUser(adminUser);
        setProfile(adminProfile);
        localStorage.setItem('demo_user', JSON.stringify(adminUser));
        localStorage.setItem('demo_profile', JSON.stringify(adminProfile));
      } else if (email.includes('parceira') || email.includes('partner')) {
        const partnerUser = { id: 'demo-partner-id', email, user_metadata: { full_name: 'Artesã Parceira (Demo)' } };
        const partnerProfile = { id: 'demo-partner-id', email, full_name: 'Artesã Parceira (Demo)', is_admin: false, role: 'partner', partner_status: 'approved', partner_default_commission_pct: 70 };
        setUser(partnerUser);
        setProfile(partnerProfile);
        localStorage.setItem('demo_user', JSON.stringify(partnerUser));
        localStorage.setItem('demo_profile', JSON.stringify(partnerProfile));
      } else if (email.includes('colunista')) {
        const colunistaUser = { id: 'demo-colunista-id', email, user_metadata: { full_name: 'Colunista (Demo)' } };
        const colunistaProfile = { id: 'demo-colunista-id', email, full_name: 'Colunista (Demo)', is_admin: false, role: 'client', user_tags: ['colunista'] };
        setUser(colunistaUser);
        setProfile(colunistaProfile);
        localStorage.setItem('demo_user', JSON.stringify(colunistaUser));
        localStorage.setItem('demo_profile', JSON.stringify(colunistaProfile));
      } else {
        const clientUser = { id: 'demo-client-id', email, user_metadata: { full_name: 'Cliente Estudo' } };
        const clientProfile = { id: 'demo-client-id', email, full_name: 'Cliente Estudo', is_admin: false, role: 'client' };
        setUser(clientUser);
        setProfile(clientProfile);
        localStorage.setItem('demo_user', JSON.stringify(clientUser));
        localStorage.setItem('demo_profile', JSON.stringify(clientProfile));
      }
      return { error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signUp = async (email, password, fullName) => {
    if (isDemoMode) {
      const newUser = { id: 'demo-new-id', email, user_metadata: { full_name: fullName } };
      const newProfile = { id: 'demo-new-id', email, full_name: fullName, is_admin: false, role: 'client' };
      setUser(newUser);
      setProfile(newProfile);
      localStorage.setItem('demo_user', JSON.stringify(newUser));
      localStorage.setItem('demo_profile', JSON.stringify(newProfile));
      return { error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    return { data, error };
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('amoreja_auth_user');
    localStorage.removeItem('amoreja_auth_profile');

    if (isDemoMode) {
      localStorage.removeItem('demo_user');
      localStorage.removeItem('demo_profile');
      return { error: null };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  // Permite alternar o modo Admin manualmente no rodapé do modo Demo para testes
  const toggleDemoAdmin = () => {
    if (isDemoMode && profile) {
      const updatedProfile = { ...profile, is_admin: !profile.is_admin, role: !profile.is_admin ? 'admin' : 'client' };
      setProfile(updatedProfile);
      localStorage.setItem('demo_profile', JSON.stringify(updatedProfile));
    }
  };

  // Permite alternar para modo Parceira no modo Demo para testes
  const toggleDemoPartner = () => {
    if (isDemoMode && profile) {
      const isCurrentlyPartner = profile.role === 'partner' || profile.is_partner;
      const updatedProfile = { 
        ...profile, 
        role: isCurrentlyPartner ? 'client' : 'partner',
        is_partner: !isCurrentlyPartner,
        partner_status: !isCurrentlyPartner ? 'approved' : 'pending',
        partner_default_commission_pct: 70
      };
      setProfile(updatedProfile);
      localStorage.setItem('demo_profile', JSON.stringify(updatedProfile));
    }
  };

  const emailToCheck = (user?.email || profile?.email || '').toLowerCase().trim();
  const isSuperAdmin = 
    emailToCheck.includes('edsonmanoel') || 
    emailToCheck.includes('edsonmaneol') || 
    emailToCheck.startsWith('admin@amoreja') ||
    profile?.is_admin === true ||
    profile?.role === 'admin';

  const isAdmin = isSuperAdmin || profile?.is_admin === true || profile?.role === 'admin' || false;
  const isPartner = isSuperAdmin || profile?.role === 'partner' || profile?.is_partner === true || profile?.partner_status === 'approved' || (profile?.user_tags && profile.user_tags.includes('partner'));
  const partnerStatus = isSuperAdmin ? 'approved' : (profile?.partner_status || (profile?.role === 'partner' ? 'approved' : 'pending'));

  const isColumnist = isSuperAdmin || (profile?.user_tags && profile.user_tags.includes('colunista'));
  const isMaratonista = isSuperAdmin || (profile?.user_tags && profile.user_tags.includes('maratonista'));

  const value = {
    user,
    profile,
    isAdmin,
    isPartner,
    isColumnist,
    isMaratonista,
    partnerStatus,
    loading,
    isDemoMode,
    signIn,
    signUp,
    signOut,
    updateProfile,
    toggleDemoAdmin,
    toggleDemoPartner
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
