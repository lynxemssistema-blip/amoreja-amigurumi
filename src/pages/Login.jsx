import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, ShieldCheck } from 'lucide-react';
import './Login.css';

export default function Login() {
  const { signIn, signUp, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    if (!email || !password || (isRegister && !fullName)) {
      setErrorMsg('Por favor, preencha todos os campos.');
      setSubmitting(false);
      return;
    }

    try {
      if (isRegister) {
        const { data, error } = await signUp(email, password, fullName);
        if (error) throw error;
        
        // Tenta forçar o login caso o Supabase não faça automaticamente (se a confirmação de email estiver desativada)
        const loginResult = await signIn(email, password);
        
        if (loginResult.error && loginResult.error.message.includes('Email not confirmed')) {
          setSuccessMsg('Cadastro realizado! Por favor, verifique seu email para confirmar a conta e poder acessar.');
          return;
        }

        setSuccessMsg('Cadastro realizado com sucesso! Redirecionando...');
        setTimeout(() => {
          navigate(-1); // Volta para a página anterior (ex: carrinho)
        }, 1500);
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        setSuccessMsg('Login realizado com sucesso!');
        setTimeout(() => {
          if (email.includes('admin')) {
            navigate('/admin');
          } else {
            navigate(-1); // Volta de onde veio (ex: carrinho)
          }
        }, 1200);
      }
    } catch (err) {
      let translatedError = err.message || 'Erro ao processar autenticação.';
      if (translatedError.includes('Invalid login credentials')) {
        translatedError = 'E-mail ou senha incorretos.';
      } else if (translatedError.includes('User already registered')) {
        translatedError = 'Este e-mail já está cadastrado.';
      } else if (translatedError.includes('Email not confirmed')) {
        translatedError = 'Conta inativa. O e-mail não foi confirmado ou está bloqueado.';
      }
      setErrorMsg(translatedError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page container section-padding">
      <div className="login-card animate-fade-in">
        {isDemoMode && (
          <div className="demo-login-info">
            <ShieldCheck size={20} className="demo-icon" />
            <div>
              <strong>Modo Estudo / Demo Ativo</strong>
              <p>Qualquer login funcionará. Use um email com a palavra <strong>"admin"</strong> (ex: <code>admin@amoreja.com</code>) para entrar como Administrador e testar o painel de controle do site.</p>
            </div>
          </div>
        )}

        <div className="login-card-header">
          <h2 className="login-card-title">{isRegister ? 'Criar Nova Conta' : 'Acesse Sua Conta'}</h2>
          <p className="login-card-subtitle">
            {isRegister 
              ? 'Cadastre-se para baixar suas receitas compradas' 
              : 'Faça login para gerenciar suas receitas de Amigurumi'}
          </p>
        </div>

        {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Nome Completo</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input 
                  type="text" 
                  id="fullName"
                  className="form-control" 
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">E-mail</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input 
                type="email" 
                id="email"
                className="form-control" 
                placeholder="seu-email@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Senha</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input 
                type="password" 
                id="password"
                className="form-control" 
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full submit-btn" 
            disabled={submitting}
          >
            {submitting ? 'Aguarde...' : isRegister ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        <div className="login-card-footer">
          {isRegister ? (
            <p>Já possui conta? <button onClick={() => { setIsRegister(false); setErrorMsg(''); }} className="toggle-form-btn">Faça Login</button></p>
          ) : (
            <p>Novo por aqui? <button onClick={() => { setIsRegister(true); setErrorMsg(''); }} className="toggle-form-btn">Crie uma Conta</button></p>
          )}
        </div>
      </div>
    </div>
  );
}
