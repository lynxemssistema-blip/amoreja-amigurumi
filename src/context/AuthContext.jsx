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
      
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error("Erro ao buscar perfil do banco:", err.message);
      // Fallback em caso de falha de leitura (por exemplo, tabela vazia)
      setProfile({ id: userId, is_admin: false });
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
      const { data, error } = await supabase
        .from('new_amoreja_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
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
        const adminProfile = { id: 'demo-user-id', email, full_name: 'Marcia Reggiani (Demo)', is_admin: true };
        setUser(adminUser);
        setProfile(adminProfile);
        localStorage.setItem('demo_user', JSON.stringify(adminUser));
        localStorage.setItem('demo_profile', JSON.stringify(adminProfile));
      } else {
        const clientUser = { id: 'demo-client-id', email, user_metadata: { full_name: 'Cliente Estudo' } };
        const clientProfile = { id: 'demo-client-id', email, full_name: 'Cliente Estudo', is_admin: false };
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
      const newProfile = { id: 'demo-new-id', email, full_name: fullName, is_admin: false };
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
      const updatedProfile = { ...profile, is_admin: !profile.is_admin };
      setProfile(updatedProfile);
      localStorage.setItem('demo_profile', JSON.stringify(updatedProfile));
    }
  };

  const value = {
    user,
    profile,
    isAdmin: profile?.is_admin || false,
    loading,
    isDemoMode,
    signIn,
    signUp,
    signOut,
    updateProfile,
    toggleDemoAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
