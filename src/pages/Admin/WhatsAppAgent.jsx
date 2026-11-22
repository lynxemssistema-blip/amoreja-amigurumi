import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { Send, Bot, User, Cpu } from 'lucide-react';
import './WhatsAppAgent.css';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export default function WhatsAppAgent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadChatHistory = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('new_amoreja_wa_agent_chats')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);
        
      if (error) throw error;
      if (data) {
        const formatted = data.map(m => ({
          role: m.sender === 'admin' ? 'user' : 'model',
          parts: [{ text: m.message }],
          id: m.id
        }));
        setMessages(formatted);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err.message);
    }
  };

  const saveMessageToDB = async (messageText, sender) => {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.from('new_amoreja_wa_agent_chats').insert([{
        message: messageText,
        sender: sender
      }]);
    } catch (err) {
      console.error("Erro ao salvar mensagem:", err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to UI immediately
    const newUserMsg = { role: 'user', parts: [{ text: userMessage }], id: Date.now().toString() };
    setMessages(prev => [...prev, newUserMsg]);
    
    // Save user message to DB asynchronously
    saveMessageToDB(userMessage, 'admin');

    setLoading(true);
    
    try {
      // 1. Fetch relevant context from WhatsApp messages
      // For a real MVP, we just fetch the last 100 messages from the database
      // so the AI has context of what people are talking about on WhatsApp.
      let waContext = "Nenhuma mensagem de WhatsApp registrada recentemente.";
      
      if (isSupabaseConfigured()) {
        const { data: waMsgs } = await supabase
          .from('new_amoreja_wa_messages')
          .select('sender_name, message_type, content, created_at, new_amoreja_wa_contacts(name)')
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (waMsgs && waMsgs.length > 0) {
          waContext = waMsgs.reverse().map(m => 
            `[${new Date(m.created_at).toLocaleString()}] Em "${m.new_amoreja_wa_contacts?.name || 'Desconhecido'}": ${m.sender_name} enviou um(a) ${m.message_type}. Conteúdo/Transcrição: ${m.content || '(Sem texto)'}`
          ).join('\n');
        }
      }

      const systemInstruction = `Você é o Agente IA da Amoreja Amigurumi. Seu objetivo é ajudar o Administrador a entender as conversas dos clientes e grupos de WhatsApp.
Aqui estão as últimas 50 mensagens registradas no WhatsApp da loja:
---
${waContext}
---
Responda às perguntas do Administrador baseando-se apenas neste histórico. Seja direto e útil.`;

      // 2. Call Gemini API (modelo econômico e ativo)
      const model = genAI.getGenerativeModel({ 
        model: "gemini-3.5-flash-lite",
        systemInstruction: systemInstruction 
      });
      
      // We pass the previous chat history to maintain conversation flow
      const chat = model.startChat({
        history: messages.map(m => ({ role: m.role, parts: m.parts }))
      });
      
      const result = await chat.sendMessage(userMessage);
      const aiResponseText = result.response.text();
      
      // Add AI response to UI
      const newAiMsg = { role: 'model', parts: [{ text: aiResponseText }], id: (Date.now()+1).toString() };
      setMessages(prev => [...prev, newAiMsg]);
      
      // Save AI message to DB
      saveMessageToDB(aiResponseText, 'ai');

    } catch (err) {
      console.error("Erro na comunicação com a IA:", err);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: '❌ Desculpe, ocorreu um erro ao conectar com o cérebro da IA (Gemini).' }], id: 'error' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wa-agent-container">
      <div className="admin-page-header">
        <h2>Agente de IA (CRM WhatsApp)</h2>
      </div>
      
      <div className="chat-window">
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <Cpu size={48} className="text-muted" />
              <h3>Olá! Eu sou o seu Assistente IA.</h3>
              <p>Pergunte-me qualquer coisa sobre os grupos e contatos do WhatsApp que estamos monitorando.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={msg.id || idx} className={`chat-bubble-row ${msg.role === 'user' ? 'row-user' : 'row-ai'}`}>
                {msg.role === 'model' && (
                  <div className="avatar ai-avatar">
                    <Bot size={20} />
                  </div>
                )}
                <div className={`chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
                  {msg.parts[0].text.split('\n').map((line, i) => <p key={i} style={{ margin: line ? '0 0 8px 0' : '0' }}>{line}</p>)}
                </div>
                {msg.role === 'user' && (
                  <div className="avatar user-avatar">
                    <User size={20} />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="chat-bubble-row row-ai">
              <div className="avatar ai-avatar">
                <Bot size={20} />
              </div>
              <div className="chat-bubble bubble-ai bubble-loading">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSend} className="chat-input-area">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ex: Alguém falou sobre o urso Teddy no grupo hoje?"
            disabled={loading}
          />
          <button type="submit" disabled={!input.trim() || loading} className="btn btn-primary btn-send">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
