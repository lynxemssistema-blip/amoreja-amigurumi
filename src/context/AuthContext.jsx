import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Carrega e observa o estado de autenticação
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.warn("Supabase não configurado. Entrando em Modo Demo (Simulado).");
      setIsDemoMode(true);
      
      // Simula usuário logado como administrador para demonstração de estudo
      const demoUser = {
        id: 'demo-user-id',
        email: 'admin@amoreja.com.br',
        user_metadata: { full_name: 'Marcia Reggiani (Demo)' }
      };
      const demoProfile = {
        id: 'demo-user-id',
        email: 'admin@amoreja.com.br',
        full_name: 'Marcia Reggiani (Demo)',
        is_admin: true
      };
      
      // Salva no localStorage para simular persistência
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
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Erro ao obter sessão:", err);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('new_amoreja_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      let profileData = data || { id: userId, is_admin: false, role: 'client', user_tags: [] };

      // Fallback transparente em new_amoreja_settings se colunas de parceira forem salvas em settings
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

      setProfile(profileData);
    } catch (err) {
      console.error("Erro ao buscar perfil do banco:", err.message);
      // Fallback em caso de falha de leitura
      setProfile({ id: userId, is_admin: false, role: 'client', user_tags: [] });
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
    if (isDemoMode) {
      setUser(null);
      setProfile(null);
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

  const isPartner = profile?.role === 'partner' || profile?.is_partner === true || profile?.partner_status === 'approved' || (profile?.user_tags && profile.user_tags.includes('partner'));
  const partnerStatus = profile?.partner_status || (profile?.role === 'partner' ? 'approved' : 'pending');

  const isColumnist = profile?.user_tags && profile.user_tags.includes('colunista');
  const isMaratonista = profile?.user_tags && profile.user_tags.includes('maratonista');

  const value = {
    user,
    profile,
    isAdmin: profile?.is_admin || profile?.role === 'admin' || false,
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
