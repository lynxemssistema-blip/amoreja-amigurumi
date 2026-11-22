import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  Search, 
  MoreVertical, 
  Send, 
  Bot, 
  User, 
  MessageSquare, 
  RefreshCw, 
  Mic, 
  Image as ImageIcon, 
  X as XIcon, 
  QrCode, 
  Smartphone, 
  Wifi, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Users,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  ShieldCheck,
  Phone,
  Video,
  Lock,
  Play,
  Pause,
  Download,
  FileText,
  File,
  Film,
  Music,
  Trash2,
  Square,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  CheckSquare,
  SlidersHorizontal,
  Layers,
  FileSpreadsheet,
  Clock
} from 'lucide-react';
import WhatsAppConnectionModal from '../../components/WhatsAppConnectionModal';
import WhatsAppReportsModal from './WhatsAppReportsModal';
import {
  fetchAllArchivedMarciaChats,
  fetchArchiveTotalMessagesCount,
  fetchArchivedMessagesForChat,
  syncLatestMessagesForSingleChat,
  syncMarciaFullHistoryInApp,
  upsertMarciaMessagesBatch,
  upsertMarciaChatsBatch,
  extractWaMessageRow,
  formatMarciaJid
} from '../../services/marciaArchiveService';
import './WhatsAppWebMarcia.css';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// Credenciais da Instância Márcia
// Helper para parsing seguro de JSON sem estourar "Unexpected end of JSON input"
const safeJson = async (response, fallback = null) => {
  try {
    if (!response || !response.ok) return fallback;
    const text = await response.text();
    if (!text || !text.trim()) return fallback;
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

const EVO_MARCIA_URL = import.meta.env.VITE_EVO_MARCIA_URL || 'https://evo.lynxems.com.br';
const EVO_MARCIA_API_KEY = import.meta.env.VITE_EVO_MARCIA_API_KEY || '8A737100D665-451D-8E66-6CCF4380C98E';
const EVO_MARCIA_INSTANCE = import.meta.env.VITE_EVO_MARCIA_INSTANCE || 'Marcia';

// Modelos Gemini (melhores e mais econômicos ativos)
const AI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
const TRANSCRIPTION_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

const AVATAR_COLORS = [
  '#0d9488', '#0284c7', '#4f46e5', '#7c3aed', 
  '#c026d3', '#db2777', '#e11d48', '#ea580c', 
  '#d97706', '#16a34a', '#0891b2', '#4338ca'
];

const getColor = (key = '') => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = key.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const formatJid = (jid = '') => {
  const n = jid.split('@')[0].split(':')[0];
  if (jid.includes('@g.us')) return 'Grupo do WhatsApp';
  return n.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3') || n;
};

const formatSeconds = (sec) => {
  if (!sec) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const num = typeof bytes === 'object' ? (bytes.low || 0) : Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

// Formatação inteligente de datas para divisores
const getMessageDateLabel = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return 'HOJE';
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isYesterday) return 'ONTEM';
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Cache global em memória de mídias já baixadas / falhas e checagem de URL expirada
const mediaBase64Cache = new Map();
const failedMediaIds = new Set();
const failedAvatars = new Set();

const isExpiredWhatsAppUrl = (url) => {
  if (!url || typeof url !== 'string') return true;
  try {
    const parsed = new URL(url);
    const oe = parsed.searchParams.get('oe');
    if (oe && /^[0-9a-fA-F]+$/.test(oe)) {
      if (parseInt(oe, 16) * 1000 < Date.now()) return true;
    }
  } catch {
    return false;
  }
  return false;
};

// ── COMPONENTE DE MÍDIA COMPLETO DO WHATSAPP (ÁUDIO, VÍDEO, IMAGEM, DOCUMENTO) ──
const WhatsAppMediaMessage = ({ 
  rawMessage, 
  messageId, 
  fromMe, 
  senderName, 
  senderJid, 
  timestamp, 
  onOpenLightbox 
}) => {
  const [mediaData, setMediaData] = useState(null);
  const [rawBase64, setRawBase64] = useState(null);
  const [mimeType, setMimeType] = useState(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [mediaExpired, setMediaExpired] = useState(false);
  const aliveRef = useRef(true);
  
  // Áudio Player com scrubber e velocidades
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);

  // Transcrição IA
  const [transcription, setTranscription] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [usedModel, setUsedModel] = useState(null);

  const videoMsg = rawMessage?.message?.videoMessage;
  const imageMsg = rawMessage?.message?.imageMessage;
  const audioMsg = rawMessage?.message?.audioMessage;
  const docMsg = rawMessage?.message?.documentMessage;
  const stickerMsg = rawMessage?.message?.stickerMessage;

  const mediaObj = audioMsg || videoMsg || imageMsg || docMsg || stickerMsg || null;
  const mediaExpiredByUrl = mediaObj?.url ? isExpiredWhatsAppUrl(mediaObj.url) : false;

  // Imagem base64 do thumbnail já embutida no payload WhatsApp
  const thumbBase64 = videoMsg?.jpegThumbnail || imageMsg?.jpegThumbnail || stickerMsg?.jpegThumbnail;
  const initialThumbSrc = thumbBase64 ? `data:image/jpeg;base64,${thumbBase64}` : null;

  // Alturas consistentes da forma de onda para este áudio específico
  const waveHeights = useMemo(() => {
    let hash = 0;
    const seed = messageId || (audioMsg ? String(audioMsg.seconds) : 'wa');
    for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
    const heights = [];
    for (let i = 0; i < 28; i++) {
      const val = Math.abs(Math.sin((hash + i * 17) * 0.18));
      heights.push(Math.round(25 + val * 70));
    }
    return heights;
  }, [messageId, audioMsg]);

  const fetchMediaFromEvolution = async (force = false) => {
    if (!rawMessage) return;

    if (!force && messageId && mediaBase64Cache.has(messageId)) {
      const cached = mediaBase64Cache.get(messageId);
      if (aliveRef.current && cached) {
        setMediaData(cached.dataUrl);
        setRawBase64(cached.base64);
        setMimeType(cached.mimetype);
        setMediaExpired(false);
      }
      return;
    }

    if (!force && (mediaExpiredByUrl || (messageId && failedMediaIds.has(messageId)))) {
      if (aliveRef.current) setMediaExpired(true);
      return;
    }

    try {
      if (aliveRef.current) {
        setLoadingMedia(true);
        setMediaExpired(false);
      }
      const res = await fetch(`${EVO_MARCIA_URL}/chat/getBase64FromMediaMessage/${EVO_MARCIA_INSTANCE}`, {
        method: 'POST',
        headers: { 'apikey': EVO_MARCIA_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: rawMessage })
      });

      if (res.ok) {
        const d = await safeJson(res, null);
        if (aliveRef.current && d?.base64) {
          const dataUrl = `data:${d.mimetype};base64,${d.base64}`;
          if (messageId) {
            mediaBase64Cache.set(messageId, { dataUrl, base64: d.base64, mimetype: d.mimetype });
            failedMediaIds.delete(messageId);
          }
          setMediaData(dataUrl);
          setRawBase64(d.base64);
          setMimeType(d.mimetype);
          setMediaExpired(false);
        }
      } else {
        if (messageId) failedMediaIds.add(messageId);
        if (aliveRef.current) setMediaExpired(true);
      }
    } catch {
      if (messageId) failedMediaIds.add(messageId);
      if (aliveRef.current) setMediaExpired(true);
    } finally {
      if (aliveRef.current) setLoadingMedia(false);
    }
  };

  // Buscar transcrição salva e stream de mídia quando não expirado
  useEffect(() => {
    aliveRef.current = true;
    (async () => {
      if (audioMsg && messageId && isSupabaseConfigured()) {
        try {
          const { data } = await supabase
            .from('new_amoreja_wa_transcriptions')
            .select('transcription')
            .eq('message_id', messageId)
            .maybeSingle();
          if (aliveRef.current && data?.transcription) {
            setTranscription(data.transcription);
            setUsedModel('salvo');
          }
        } catch (_) {}
      }

      await fetchMediaFromEvolution(false);
    })();

    return () => { aliveRef.current = false; };
  }, [rawMessage, messageId, mediaExpiredByUrl]);

  // Transcrição de áudio inteligente com Gemini AI
  const handleTranscribeAudio = async () => {
    if (!rawBase64 && !mediaData) {
      alert(mediaExpired ? 'Este áudio antigo expirou no servidor do WhatsApp e não está disponível para download.' : 'Aguarde o áudio carregar completamente para transcrever.');
      return;
    }
    setTranscribing(true);
    try {
      const mime = mimeType || audioMsg?.mimetype || 'audio/ogg';
      const b64 = rawBase64 || (mediaData ? mediaData.split(',')[1] : null);
      if (!b64) throw new Error('Dados de áudio não encontrados.');

      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const blob = new Blob([arr], { type: mime.split(';')[0] });

      const key = import.meta.env.VITE_GEMINI_API_KEY;
      const upRes = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${key}`, {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Command': 'start, upload, finalize',
          'X-Goog-Upload-Header-Content-Length': blob.size,
          'X-Goog-Upload-Header-Content-Type': mime.split(';')[0],
          'Content-Type': 'application/json'
        },
        body: blob
      });
      if (!upRes.ok) throw new Error(`Falha no upload do áudio (${upRes.status})`);
      const fileUri = (await upRes.json()).file?.uri;
      if (!fileUri) throw new Error('URI do áudio não retornado.');

      let text = null;
      let modelUsed = null;
      for (const m of TRANSCRIPTION_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: m });
          const r = await model.generateContent([
            'Transcreva com precisão o que é falado neste áudio em português.',
            { fileData: { mimeType: mime.split(';')[0], fileUri } }
          ]);
          text = r.response.text();
          modelUsed = m;
          break;
        } catch (e) {
          if (e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED')) continue;
          throw e;
        }
      }
      if (!text) throw new Error('Modelos de IA ocupados. Tente novamente em instantes.');

      setTranscription(text);
      setUsedModel(modelUsed);

      if (messageId && isSupabaseConfigured()) {
        supabase.from('new_amoreja_wa_transcriptions').upsert({
          message_id: messageId,
          transcription: text,
          created_at: new Date().toISOString()
        }, { onConflict: 'message_id' }).then();
      }
    } catch (e) {
      setTranscription(`❌ ${e.message || 'Erro ao transcrever'}`);
    } finally {
      setTranscribing(false);
    }
  };

  // Controle de reprodução de áudio
  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Alternar velocidade de reprodução (1x / 1.5x / 2x)
  const handleToggleRate = () => {
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // Clicar para buscar (seek) na onda do áudio
  const handleWaveSeek = (e, totalSec) => {
    if (!audioRef.current || !totalSec) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = pct * totalSec;
    audioRef.current.currentTime = newTime;
    setAudioCurrentTime(newTime);
  };

  // 1. ÁUDIO / MENSAGEM DE VOZ WHATSAPP
  if (audioMsg) {
    const totalSec = audioMsg.seconds || Math.round(audioDuration) || 0;
    const progressPct = totalSec > 0 ? Math.min(100, (audioCurrentTime / totalSec) * 100) : 0;

    return (
      <div className="wab-audio-box">
        {mediaData && (
          <audio 
            ref={audioRef} 
            src={mediaData} 
            onTimeUpdate={(e) => setAudioCurrentTime(e.target.currentTime)}
            onLoadedMetadata={(e) => setAudioDuration(e.target.duration)}
            onEnded={() => { setIsPlaying(false); setAudioCurrentTime(0); }}
            style={{ display: 'none' }}
          />
        )}

        <div className="wab-audio-full-row">
          {/* Avatar do remetente com selo de microfone verde */}
          <div className="wab-audio-avatar-wrap">
            <Avatar name={senderName || (fromMe ? 'Márcia' : 'Contato')} jidKey={senderJid} size={38} />
            <div className="wab-audio-mic-badge">
              <Mic size={10} color="#ffffff" />
            </div>
          </div>

          <div className="wab-audio-body">
            <div className="wab-audio-controls-line">
              {/* Botão Play / Pause circular */}
              <button 
                type="button" 
                className="wab-audio-play-circle"
                onClick={togglePlayAudio}
                disabled={!mediaData}
                title={isPlaying ? "Pausar áudio" : (mediaExpired && !mediaData ? "Áudio expirado no WhatsApp" : "Tocar mensagem de voz")}
              >
                {loadingMedia && !mediaData ? (
                  <RefreshCw size={15} className="fa-spin" />
                ) : isPlaying ? (
                  <Pause size={17} />
                ) : (
                  <Play size={17} style={{ marginLeft: '2px' }} />
                )}
              </button>

              {/* Barra de Onda Interativa (Waveform Scrubber) */}
              <div 
                className="wab-waveform-scrubber"
                onClick={(e) => handleWaveSeek(e, totalSec)}
                title="Clique para avançar ou retroceder no áudio"
              >
                {waveHeights.map((h, i) => {
                  const barPct = (i / waveHeights.length) * 100;
                  const isPlayed = progressPct >= barPct;
                  return (
                    <div 
                      key={i} 
                      className={`wab-waveform-bar ${isPlayed ? 'played' : ''}`}
                      style={{ height: `${h}%` }}
                    />
                  );
                })}
                <div 
                  className="wab-waveform-dot"
                  style={{ left: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Linha Inferior: Tempo e Seletor de Velocidade (1x / 1.5x / 2x) */}
            <div className="wab-audio-sub-row">
              <span className="wab-audio-time-label">
                {formatSeconds(isPlaying ? audioCurrentTime : totalSec)}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button 
                  type="button" 
                  className="wab-audio-speed-pill"
                  onClick={handleToggleRate}
                  title="Alterar velocidade (1x, 1.5x, 2x)"
                >
                  {playbackRate}x
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status de mídia antiga / Botão de Transcrição IA */}
        {mediaExpired && !mediaData && (
          <div className="wab-media-expired-pill">
            <span>Áudio antigo expirado no WhatsApp</span>
            <button type="button" onClick={() => fetchMediaFromEvolution(true)} className="wab-media-retry-btn">
              Tentar baixar
            </button>
          </div>
        )}

        {(mediaData || transcription) && (!transcription ? (
          <button 
            type="button"
            className="wab-transcribe-btn"
            onClick={handleTranscribeAudio}
            disabled={transcribing}
          >
            {transcribing ? <RefreshCw size={12} className="fa-spin" /> : <Bot size={13} />}
            <span>{transcribing ? 'Transcrevendo com IA...' : 'Transcrever Áudio com IA'}</span>
          </button>
        ) : (
          <div className="wab-transcription-box">
            <span style={{ fontWeight: 700, color: '#008069', display: 'block', fontSize: '11px', marginBottom: '2px' }}>
              ✨ Transcrição{usedModel ? ` (${usedModel})` : ''}:
            </span>
            {transcription}
          </div>
        ))}
      </div>
    );
  }

  // 2. VÍDEO WHATSAPP COM PLAYER OU THUMBNAIL
  if (videoMsg) {
    const videoSrc = mediaData;
    const thumbSrc = mediaData || initialThumbSrc;
    const durationLabel = formatSeconds(videoMsg.seconds);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div 
          className="wab-video-wrapper"
          onClick={() => onOpenLightbox({
            type: 'video',
            url: videoSrc,
            thumb: thumbSrc,
            caption: videoMsg.caption,
            sender: senderName,
            date: timestamp
          })}
        >
          {videoSrc ? (
            <video 
              src={videoSrc} 
              controls 
              style={{ width: '100%', maxHeight: '320px', borderRadius: '7px', display: 'block' }} 
            />
          ) : (
            <>
              {thumbSrc ? (
                <img src={thumbSrc} alt="Vídeo" className="wab-video-thumb" />
              ) : (
                <div style={{ width: '280px', height: '180px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Film size={40} color="#94a3b8" />
                </div>
              )}
              <div className="wab-video-overlay">
                <div className="wab-video-play-icon">
                  <Play size={24} style={{ marginLeft: '3px' }} />
                </div>
              </div>
            </>
          )}

          <div className="wab-video-duration-badge">
            🎥 {durationLabel}
          </div>
        </div>

        {videoMsg.caption && (
          <div style={{ fontSize: '14.2px', lineHeight: '19px', marginTop: '2px', wordBreak: 'break-word' }}>
            {videoMsg.caption}
          </div>
        )}
        {mediaExpired && !mediaData && (
          <div className="wab-media-expired-pill">
            <span>Vídeo expirado no WhatsApp</span>
            <button type="button" onClick={() => fetchMediaFromEvolution(true)} className="wab-media-retry-btn">
              Tentar baixar
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. IMAGEM WHATSAPP COM THUMBNAIL E LIGHTBOX
  if (imageMsg) {
    const imgSrc = mediaData || initialThumbSrc;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {imgSrc && (
          <img 
            src={imgSrc} 
            alt="Foto" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '340px', 
              borderRadius: '7px', 
              display: 'block', 
              objectFit: 'cover', 
              cursor: 'pointer' 
            }}
            onClick={() => onOpenLightbox({
              type: 'image',
              url: imgSrc,
              caption: imageMsg.caption,
              sender: senderName,
              date: timestamp
            })}
          />
        )}
        {imageMsg.caption && (
          <div style={{ fontSize: '14.2px', lineHeight: '19px', marginTop: '2px', wordBreak: 'break-word' }}>
            {imageMsg.caption}
          </div>
        )}
        {mediaExpired && !mediaData && (
          <div className="wab-media-expired-pill">
            <span>{imgSrc ? 'Miniatura (foto original expirada)' : 'Foto antiga expirada no WhatsApp'}</span>
            <button type="button" onClick={() => fetchMediaFromEvolution(true)} className="wab-media-retry-btn">
              Tentar baixar
            </button>
          </div>
        )}
      </div>
    );
  }

  // 4. DOCUMENTO (PDF, DOCX, ZIP, ETC.)
  if (docMsg) {
    const fileName = docMsg.fileName || 'Documento';
    const fileSize = formatFileSize(docMsg.fileLength);

    return (
      <div 
        className="wab-document-card"
        onClick={() => {
          if (mediaData) {
            const a = document.createElement('a');
            a.href = mediaData;
            a.download = fileName;
            a.click();
          } else {
            fetchMediaFromEvolution(true);
          }
        }}
      >
        <div className="wab-doc-icon-wrap">
          <FileText size={22} />
        </div>
        <div className="wab-doc-info">
          <span className="wab-doc-name" title={fileName}>{fileName}</span>
          <span className="wab-doc-size">
            {fileSize} • {mediaExpired && !mediaData ? 'Expirado • Clique para tentar baixar' : 'Clique para baixar'}
          </span>
        </div>
        <Download size={18} color="#008069" style={{ flexShrink: 0 }} />
      </div>
    );
  }

  // 5. STICKER / FIGURINHA
  if (stickerMsg) {
    const stickerSrc = mediaData || initialThumbSrc;
    return (
      <div style={{ padding: '4px' }}>
        {stickerSrc ? (
          <img src={stickerSrc} alt="Figurinha" style={{ width: '130px', height: '130px', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: '13px', color: '#667781' }}>🎨 Figurinha</span>
        )}
      </div>
    );
  }

  return null;
};

// ── AVATAR ──────────────────────────────────────────────────────────────────
const Avatar = ({ name, picUrl, jidKey, size = 40 }) => {
  const [imgFailed, setImgFailed] = useState(() =>
    picUrl ? (failedAvatars.has(picUrl) || isExpiredWhatsAppUrl(picUrl)) : false
  );

  useEffect(() => {
    setImgFailed(picUrl ? (failedAvatars.has(picUrl) || isExpiredWhatsAppUrl(picUrl)) : false);
  }, [picUrl]);

  const initial = (name || '?').charAt(0).toUpperCase();
  const bg = getColor(jidKey || name || '');

  const canShowImg = Boolean(picUrl) && !imgFailed && !failedAvatars.has(picUrl) && !isExpiredWhatsAppUrl(picUrl);

  return (
    <div style={{
      width: size, 
      height: size, 
      borderRadius: '50%',
      background: canShowImg ? 'transparent' : bg,
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      flexShrink: 0, 
      overflow: 'hidden',
      fontSize: size * 0.42, 
      color: '#fff', 
      fontWeight: 700,
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    }}>
      {canShowImg ? (
        <img 
          src={picUrl} 
          alt={name}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => {
            failedAvatars.add(picUrl);
            setImgFailed(true);
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      ) : initial}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: WhatsApp Business Web Márcia Reggiani
// ═════════════════════════════════════════════════════════════════════════════
export default function WhatsAppWebMarcia() {
  const [chats, setChats] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJid, setSelectedJid] = useState(null);
  const [waMessages, setWaMessages] = useState([]);
  const [aiMessages, setAiMessages] = useState([]);
  const [isAiMode, setIsAiMode] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [totalArchivedMessages, setTotalArchivedMessages] = useState(0);
  const [visibleChatsCount, setVisibleChatsCount] = useState(150);
  const [chatTotalMessages, setChatTotalMessages] = useState(0);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [fullSyncProgress, setFullSyncProgress] = useState(null);
  
  // Anexos e Menus
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [attachFile, setAttachFile] = useState(null);
  
  // Gravador de Áudio ao Vivo
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Modal Lightbox
  const [lightboxData, setLightboxData] = useState(null); // { type, url, caption, sender, date }
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxRotate, setLightboxRotate] = useState(0);

  // Central de Inteligência & Relatórios
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedChatJids, setSelectedChatJids] = useState([]);
  
  // Modal Conexão
  const [isConnModalOpen, setIsConnModalOpen] = useState(false);
  const [connInfo, setConnInfo] = useState({ 
    state: 'close', 
    number: '553175027218', 
    profileName: 'Márcia Reggiani',
    totalChats: 63992,
    totalContacts: 2955
  });

  const messagesEndRef = useRef(null);
  const chatFeedRef = useRef(null);
  const selectedItemRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);
  const archivedLoadedCountRef = useRef(0);
  const activeLoadJidRef = useRef(null);
  const fullSyncAbortRef = useRef(null);
  const fileInputImgRef = useRef(null);
  const fileInputVideoRef = useRef(null);
  const fileInputDocRef = useRef(null);
  const fileInputAudioRef = useRef(null);
  const chatInputRef = useRef(null);

  // Lista de todas as mídias da conversa atual para navegação no Lightbox
  const chatMediaList = useMemo(() => {
    return waMessages
      .filter(m => m.raw_message?.message?.imageMessage || m.raw_message?.message?.videoMessage || m.preview_url)
      .map(m => {
        const vm = m.raw_message?.message?.videoMessage;
        const im = m.raw_message?.message?.imageMessage;
        const type = vm || m.message_type === 'video' ? 'video' : 'image';
        const thumb = vm?.jpegThumbnail ? `data:image/jpeg;base64,${vm.jpegThumbnail}` : im?.jpegThumbnail ? `data:image/jpeg;base64,${im.jpegThumbnail}` : m.preview_url;
        return {
          id: m.id,
          type,
          url: m.preview_url || thumb,
          thumb,
          caption: vm?.caption || im?.caption || m.content || '',
          sender: m.sender_name || (m.from_me ? 'Márcia' : 'Contato'),
          date: m.created_at
        };
      });
  }, [waMessages]);

  const handleLightboxNav = (direction) => {
    if (!lightboxData || chatMediaList.length <= 1) return;
    const currentIdx = chatMediaList.findIndex(m => m.url === lightboxData.url || (m.id && m.id === lightboxData.id));
    if (currentIdx === -1) return;
    const nextIdx = direction === 'next'
      ? (currentIdx + 1) % chatMediaList.length
      : (currentIdx - 1 + chatMediaList.length) % chatMediaList.length;
    setLightboxData(chatMediaList[nextIdx]);
    setLightboxZoom(1);
    setLightboxRotate(0);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxData) return;
      if (e.key === 'Escape') setLightboxData(null);
      if (e.key === 'ArrowRight') handleLightboxNav('next');
      if (e.key === 'ArrowLeft') handleLightboxNav('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxData, chatMediaList]);

  // Checar status da conexão
  const checkConnectionStatus = async () => {
    try {
      const res = await fetch(`${EVO_MARCIA_URL}/instance/connectionState/${EVO_MARCIA_INSTANCE}`, {
        headers: { 'apikey': EVO_MARCIA_API_KEY }
      });
      const data = await safeJson(res, {});
      const state = data?.instance?.state || 'close';

      const fetchRes = await fetch(`${EVO_MARCIA_URL}/instance/fetchInstances`, {
        headers: { 'apikey': EVO_MARCIA_API_KEY }
      });
      const instances = await safeJson(fetchRes, []);
      const inst = Array.isArray(instances) ? instances.find(i => i.name === EVO_MARCIA_INSTANCE) : null;

      setConnInfo(prev => ({
        ...prev,
        state,
        number: inst?.number || prev.number,
        profileName: inst?.profileName || prev.profileName,
        totalChats: inst?._count?.Chat || prev.totalChats,
        totalContacts: inst?._count?.Contact || prev.totalContacts
      }));
    } catch (e) {
      console.warn('Erro ao consultar status da instância Márcia:', e.message);
    }
  };

  useEffect(() => {
    loadAllChats();
    checkConnectionStatus();
    return () => {
      fullSyncAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    setVisibleChatsCount(150);
  }, [searchQuery, filterType]);

  useEffect(() => {
    if (selectedJid) {
      loadHistory(selectedJid);
      setIsAiMode(false);
      setInputMessage('');
      setAttachFile(null);
      setIsAttachMenuOpen(false);
      stopRecordingAudio(false);
      setTimeout(() => {
        chatInputRef.current?.focus({ preventScroll: true });
      }, 100);
    }
  }, [selectedJid]);

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) return;
    const feed = chatFeedRef.current;
    if (feed) {
      feed.scrollTop = feed.scrollHeight;
    }
  }, [waMessages, aiMessages, loadingMessages]);

  // Carregar TODAS as conversas do arquivo Supabase e mesclar atualizações ao vivo da Evolution API
  const loadAllChats = async () => {
    setLoadingChats(true);
    try {
      const [archivedChats, totalMsgs] = await Promise.all([
        fetchAllArchivedMarciaChats(),
        fetchArchiveTotalMessagesCount()
      ]);

      if (totalMsgs > 0) {
        setTotalArchivedMessages(totalMsgs);
      }
      if (archivedChats.length > 0) {
        setChats(archivedChats);
      }

      const res = await fetch(`${EVO_MARCIA_URL}/chat/findChats/${EVO_MARCIA_INSTANCE}`, {
        method: 'POST',
        headers: { 'apikey': EVO_MARCIA_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (res.ok) {
        const raw = await safeJson(res, []);
        const list = Array.isArray(raw) ? raw : (raw?.records || []);
        const mergedMap = new Map();

        for (const arch of archivedChats) {
          mergedMap.set(arch.remoteJid, arch);
        }

        const chatsToSync = [];

        for (const c of list) {
          const remoteJid = c.remoteJid || c.id;
          if (!remoteJid || remoteJid === 'status@broadcast' || !String(remoteJid).includes('@')) continue;

          const lm = c.lastMessage?.message;
          const previewText = lm?.conversation
            || lm?.extendedTextMessage?.text
            || (lm?.imageMessage ? '📷 Imagem' : lm?.audioMessage ? '🎵 Áudio' : lm?.videoMessage ? '🎥 Vídeo' : lm?.documentMessage ? '📄 Documento' : 'Mensagem');

          const isGroup = remoteJid.includes('@g.us');
          const existing = mergedMap.get(remoteJid);
          const evoName = c.pushName || existing?.pushName || existing?.name || (isGroup ? 'Grupo do WhatsApp' : formatJid(remoteJid));
          const evoTimestamp = c.updatedAt || (c.lastMessage?.messageTimestamp ? new Date(Number(c.lastMessage.messageTimestamp?.low || c.lastMessage.messageTimestamp) * 1000).toISOString() : null);

          const useEvoTime = !existing?.timestamp || (evoTimestamp && new Date(evoTimestamp) >= new Date(existing.timestamp));
          const finalTs = useEvoTime ? (evoTimestamp || existing?.timestamp || null) : existing.timestamp;
          const finalLastMsg = useEvoTime && previewText ? previewText : (existing?.lastMessage || previewText || 'Mensagem');
          const finalFromMe = useEvoTime ? Boolean(c.lastMessage?.key?.fromMe) : Boolean(existing?.isFromMe);
          const finalPic = c.profilePicUrl || existing?.profilePicUrl || null;
          const finalUnread = c.unreadCount ?? existing?.unreadCount ?? 0;

          const mergedChat = {
            id: remoteJid,
            remoteJid,
            name: evoName,
            pushName: c.pushName || existing?.pushName || null,
            profilePicUrl: finalPic,
            lastMessage: finalLastMsg,
            timestamp: finalTs,
            unreadCount: finalUnread,
            messageCount: existing?.messageCount || 0,
            isGroup,
            isFromMe: finalFromMe
          };

          mergedMap.set(remoteJid, mergedChat);

          if (!existing || useEvoTime || existing.unreadCount !== finalUnread || existing.profilePicUrl !== finalPic) {
            chatsToSync.push({
              remote_jid: remoteJid,
              name: mergedChat.name,
              push_name: mergedChat.pushName,
              profile_pic_url: mergedChat.profilePicUrl,
              is_group: mergedChat.isGroup,
              last_message: mergedChat.lastMessage,
              last_from_me: mergedChat.isFromMe,
              last_message_at: mergedChat.timestamp,
              unread_count: mergedChat.unreadCount,
              message_count: mergedChat.messageCount,
              updated_at: new Date().toISOString()
            });
          }
        }

        const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return new Date(b.timestamp) - new Date(a.timestamp);
        });

        setChats(mergedList);
        if (chatsToSync.length > 0) {
          upsertMarciaChatsBatch(chatsToSync).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Erro ao carregar conversas de Márcia:', e);
    } finally {
      setLoadingChats(false);
    }
  };

  // Carregar histórico completo do arquivo Supabase + mesclar novas mensagens ao vivo
  const loadHistory = async (remoteJid) => {
    activeLoadJidRef.current = remoteJid;
    shouldScrollToBottomRef.current = true;
    archivedLoadedCountRef.current = 0;
    setLoadingMessages(true);
    setWaMessages([]);
    setAiMessages([]);
    setChatTotalMessages(0);
    setHasMoreOlder(false);

    try {
      const currentChatObj = chats.find((c) => c.remoteJid === remoteJid);
      const { messages: archivedMsgs, total } = await fetchArchivedMessagesForChat(remoteJid, {
        offset: 0,
        limit: 200
      });

      if (activeLoadJidRef.current !== remoteJid) return;

      if (archivedMsgs.length > 0) {
        archivedLoadedCountRef.current = archivedMsgs.length;
        setWaMessages(archivedMsgs);
        setChatTotalMessages(total);
        setHasMoreOlder(archivedMsgs.length < total);
        setLoadingMessages(false);
      }

      const liveMsgs = await syncLatestMessagesForSingleChat({
        remoteJid,
        evoUrl: EVO_MARCIA_URL,
        evoApiKey: EVO_MARCIA_API_KEY,
        evoInstance: EVO_MARCIA_INSTANCE,
        fallbackChatName: currentChatObj?.name || '',
        limit: 60
      });

      if (activeLoadJidRef.current !== remoteJid) return;

      if (liveMsgs.length > 0) {
        setWaMessages((prev) => {
          const map = new Map();
          for (const m of prev) map.set(m.id, m);
          for (const m of liveMsgs) map.set(m.id, m);
          return Array.from(map.values()).sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );
        });
      }
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    } finally {
      if (activeLoadJidRef.current === remoteJid) {
        setLoadingMessages(false);
      }
    }
  };

  // Carregar lotes mais antigos da conversa diretamente do arquivo Supabase
  const handleLoadOlderMessages = async (loadAll = false) => {
    if (!selectedJid || loadingOlderMessages) return;
    const feed = chatFeedRef.current;
    const prevScrollHeight = feed?.scrollHeight || 0;
    shouldScrollToBottomRef.current = false;
    setLoadingOlderMessages(true);
    const targetJid = selectedJid;

    try {
      let currentOffset = archivedLoadedCountRef.current;
      let fetchedTotal = chatTotalMessages;
      const accumulated = [];

      if (loadAll) {
        while (currentOffset < (fetchedTotal || Infinity)) {
          const { messages, total } = await fetchArchivedMessagesForChat(targetJid, {
            offset: currentOffset,
            limit: 500
          });
          if (activeLoadJidRef.current !== targetJid) return;
          fetchedTotal = total;
          if (!messages.length) break;
          accumulated.push(...messages);
          currentOffset += messages.length;
          if (currentOffset >= total || messages.length < 500) break;
        }
      } else {
        const { messages, total } = await fetchArchivedMessagesForChat(targetJid, {
          offset: currentOffset,
          limit: 200
        });
        if (activeLoadJidRef.current !== targetJid) return;
        fetchedTotal = total;
        accumulated.push(...messages);
        currentOffset += messages.length;
      }

      archivedLoadedCountRef.current = currentOffset;
      setChatTotalMessages(fetchedTotal);
      setHasMoreOlder(currentOffset < fetchedTotal);

      if (accumulated.length > 0) {
        setWaMessages((prev) => {
          const map = new Map();
          for (const m of accumulated) map.set(m.id, m);
          for (const m of prev) map.set(m.id, m);
          return Array.from(map.values()).sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );
        });

        requestAnimationFrame(() => {
          if (chatFeedRef.current) {
            chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight - prevScrollHeight;
          }
        });
      }
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  // Baixar histórico completo de TODAS as conversas da Evolution API para o Supabase no App
  const handleStartFullHistorySync = async () => {
    if (fullSyncProgress?.active) return;
    const controller = new AbortController();
    fullSyncAbortRef.current = controller;

    try {
      const result = await syncMarciaFullHistoryInApp({
        evoUrl: EVO_MARCIA_URL,
        evoApiKey: EVO_MARCIA_API_KEY,
        evoInstance: EVO_MARCIA_INSTANCE,
        signal: controller.signal,
        onProgress: (prog) => setFullSyncProgress(prog)
      });

      await loadAllChats();
      if (selectedJid) {
        await loadHistory(selectedJid);
      }

      setFullSyncProgress({
        active: false,
        completed: !result.aborted,
        aborted: result.aborted,
        page: result.totalPages,
        totalPages: result.totalPages,
        savedMessages: result.savedMessages,
        totalRemoteMessages: result.savedMessages,
        phase: result.aborted
          ? `Sincronização interrompida (${result.savedMessages.toLocaleString('pt-BR')} msgs salvas até aqui).`
          : `Histórico completo salvo! ${result.totalChats.toLocaleString('pt-BR')} conversas e ${result.savedMessages.toLocaleString('pt-BR')} mensagens sincronizadas.`
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        setFullSyncProgress((prev) => ({
          ...(prev || {}),
          active: false,
          aborted: true,
          phase: 'Sincronização interrompida pelo usuário.'
        }));
      } else {
        setFullSyncProgress((prev) => ({
          ...(prev || {}),
          active: false,
          error: err.message,
          phase: `Erro na sincronização: ${err.message}`
        }));
      }
    }
  };

  const handleStopFullHistorySync = () => {
    fullSyncAbortRef.current?.abort();
  };

  // ── GRAVADOR DE ÁUDIO DE VOZ AO VIVO ───────────────────────────────────────
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Não foi possível acessar seu microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecordingAudio = (shouldSend = true) => {
    if (!mediaRecorderRef.current) return;
    clearInterval(recordingTimerRef.current);

    if (shouldSend) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result.split(',')[1];
          await handleSendMedia('audio', base64Data, 'audio/ogg', '');
        };
      };
    }

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
  };

  // Enviar mídia (foto, vídeo, documento, áudio)
  const handleSendMedia = async (type, base64, mimeType, caption = '', fileName = '') => {
    const chat = chats.find(c => c.remoteJid === selectedJid);
    if (!chat) return;

    shouldScrollToBottomRef.current = true;
    const tempId = `local_${Date.now()}`;
    const nowIso = new Date().toISOString();

    setWaMessages(prev => [...prev, {
      id: tempId,
      content: caption || '',
      preview_url: type === 'image' || type === 'video' ? `data:${mimeType};base64,${base64}` : null,
      from_me: true,
      message_type: type,
      created_at: nowIso,
      sender_name: 'Márcia'
    }]);

    try {
      let sentRaw = null;
      if (type === 'audio') {
        const r = await fetch(`${EVO_MARCIA_URL}/message/sendWhatsAppAudio/${EVO_MARCIA_INSTANCE}`, {
          method: 'POST',
          headers: { 'apikey': EVO_MARCIA_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: chat.remoteJid, audio: base64, encoding: true })
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        sentRaw = await safeJson(r, null);
      } else {
        const endpoint = `${EVO_MARCIA_URL}/message/sendMedia/${EVO_MARCIA_INSTANCE}`;
        const body = {
          number: chat.remoteJid,
          mediatype: type === 'video' ? 'video' : type === 'document' ? 'document' : 'image',
          media: base64,
          caption: caption || '',
          fileName: fileName || undefined
        };
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'apikey': EVO_MARCIA_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        sentRaw = await safeJson(r, null);
      }

      const row = sentRaw?.key?.id
        ? extractWaMessageRow(sentRaw)
        : {
            message_id: sentRaw?.key?.id || tempId,
            remote_jid: chat.remoteJid,
            sender_name: 'Márcia',
            sender_jid: chat.remoteJid,
            from_me: true,
            message_type: type,
            content: caption || fileName || '',
            media_mime: mimeType || null,
            media_seconds: null,
            media_file_name: fileName || null,
            media_file_length: null,
            raw_message: null,
            created_at: nowIso
          };

      if (row) {
        upsertMarciaMessagesBatch([row]).catch(() => {});
        upsertMarciaChatsBatch([{
          remote_jid: chat.remoteJid,
          name: chat.name,
          push_name: chat.pushName,
          profile_pic_url: chat.profilePicUrl,
          is_group: chat.isGroup,
          last_message: caption || (type === 'audio' ? '🎵 Áudio' : type === 'video' ? '🎥 Vídeo' : type === 'document' ? `📄 ${fileName || 'Documento'}` : '📷 Imagem'),
          last_from_me: true,
          last_message_at: nowIso,
          unread_count: chat.unreadCount || 0,
          message_count: (chat.messageCount || 0) + 1,
          updated_at: nowIso
        }]).catch(() => {});
      }
    } catch (err) {
      alert('Erro ao enviar mídia: ' + err.message);
    }
  };

  // Enviar mensagem de texto normal
  const handleSendWaText = async (text, remoteJid) => {
    shouldScrollToBottomRef.current = true;
    const tempId = `local_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const chat = chats.find(c => c.remoteJid === remoteJid);

    setWaMessages(prev => [...prev, {
      id: tempId,
      content: text || '',
      from_me: true,
      message_type: 'text',
      created_at: nowIso,
      sender_name: 'Márcia'
    }]);

    try {
      const r = await fetch(`${EVO_MARCIA_URL}/message/sendText/${EVO_MARCIA_INSTANCE}`, {
        method: 'POST',
        headers: { 'apikey': EVO_MARCIA_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: remoteJid, text })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const sentRaw = await safeJson(r, null);

      const row = sentRaw?.key?.id
        ? extractWaMessageRow(sentRaw)
        : {
            message_id: tempId,
            remote_jid: remoteJid,
            sender_name: 'Márcia',
            sender_jid: remoteJid,
            from_me: true,
            message_type: 'text',
            content: text || '',
            media_mime: null,
            media_seconds: null,
            media_file_name: null,
            media_file_length: null,
            raw_message: null,
            created_at: nowIso
          };

      if (row) {
        upsertMarciaMessagesBatch([row]).catch(() => {});
        upsertMarciaChatsBatch([{
          remote_jid: remoteJid,
          name: chat?.name || formatMarciaJid(remoteJid),
          push_name: chat?.pushName || null,
          profile_pic_url: chat?.profilePicUrl || null,
          is_group: Boolean(chat?.isGroup || remoteJid.includes('@g.us')),
          last_message: (text || '').slice(0, 160),
          last_from_me: true,
          last_message_at: nowIso,
          unread_count: chat?.unreadCount || 0,
          message_count: (chat?.messageCount || 0) + 1,
          updated_at: nowIso
        }]).catch(() => {});
      }
    } catch (e) {
      alert('Erro ao enviar mensagem: ' + e.message);
    }
  };

  // Envio IA (Assistente Gemini)
  const handleSendAi = async (userMessage, currentChat) => {
    if (!currentChat) return;

    const userMsgId = Date.now().toString();
    setAiMessages(prev => [...prev, { message: userMessage, sender: 'admin', id: userMsgId }]);

    try {
      const ctx = waMessages.slice(-50).map(m =>
        `[${new Date(m.created_at).toLocaleString()}] ${m.sender_name || (m.from_me ? 'Márcia' : currentChat.name)}: ${m.content || m.message_type}`
      ).join('\n');

      if (!ctx.trim()) {
        setAiMessages(prev => [...prev, { message: '⚠️ Nenhuma mensagem encontrada no histórico para analisar.', sender: 'ai', id: 'err_' + Date.now() }]);
        return;
      }

      const sys = `Você é o Assistente Pessoal da Márcia Reggiani no WhatsApp Business. Ajude a resumir mensagens, responder clientes de forma simpática e profissional para "${currentChat.name}":\n---\n${ctx}\n---`;

      for (const modelName of AI_MODELS) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: sys });
          const result = await model.generateContent(userMessage);
          const reply = result.response.text();

          setAiMessages(prev => [...prev, { message: reply, sender: 'ai', id: (Date.now() + 1).toString() }]);
          return;
        } catch (err) {
          console.warn(`[IA Márcia] ${modelName} falhou:`, err.message);
        }
      }
      setAiMessages(prev => [...prev, { message: '⚠️ Modelos de IA momentaneamente ocupados. Tente novamente em alguns segundos.', sender: 'ai', id: 'err_' + Date.now() }]);
    } catch (err) {
      setAiMessages(prev => [...prev, { message: '❌ Erro: ' + err.message, sender: 'ai', id: 'err_' + Date.now() }]);
    }
  };

  const fileToBase64 = file => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const handleSelectFileInput = async (e, type) => {
    setIsAttachMenuOpen(false);
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setAttachFile({
      type,
      base64,
      mimeType: file.type,
      name: file.name,
      previewUrl: URL.createObjectURL(file)
    });
    e.target.value = '';
    chatInputRef.current?.focus({ preventScroll: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const chat = chats.find(c => c.remoteJid === selectedJid);
    if (!chat) return;

    if (isAiMode) {
      if (!inputMessage.trim()) return;
      const msg = inputMessage.trim(); 
      setInputMessage('');
      handleSendAi(msg, chat);
    } else if (attachFile) {
      const { type, base64, mimeType, name } = attachFile;
      const caption = inputMessage.trim();
      setAttachFile(null);
      setInputMessage('');
      await handleSendMedia(type, base64, mimeType, caption, name);
    } else {
      if (!inputMessage.trim()) return;
      const msg = inputMessage.trim(); 
      setInputMessage('');
      await handleSendWaText(msg, chat.remoteJid);
    }
  };

  // Filtragem de conversas
  const filteredChats = chats.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.remoteJid.includes(searchQuery);
    if (!matchSearch) return false;

    if (filterType === 'unread') return c.unreadCount > 0;
    if (filterType === 'groups') return c.isGroup;
    if (filterType === 'contacts') return !c.isGroup;
    return true;
  });

  const activeChat = chats.find(c => c.remoteJid === selectedJid);

  return (
    <div className="wab-container">
      {/* ── BARRA SUPERIOR WHATSAPP BUSINESS ── */}
      <header className="wab-topbar">
        <div className="wab-topbar-left">
          <div className="wab-topbar-badge">
            <Smartphone size={13} />
            <span>WhatsApp Business</span>
          </div>
          <h1 className="wab-topbar-title">Márcia Reggiani</h1>
          <p className="wab-topbar-sub">Instância: <strong>{EVO_MARCIA_INSTANCE}</strong> • +55 (31) 97502-7218</p>
        </div>

        <div className="wab-topbar-right">
          <button
            type="button"
            className={`wab-sync-btn ${fullSyncProgress?.active ? 'running' : ''}`}
            onClick={handleStartFullHistorySync}
            disabled={Boolean(fullSyncProgress?.active)}
            title="Baixar todo o histórico de conversas do WhatsApp para o banco do aplicativo"
          >
            {fullSyncProgress?.active ? (
              <>
                <RefreshCw size={14} className="fa-spin" />
                <span>
                  Baixando {fullSyncProgress.totalPages > 0 ? `${Math.round((fullSyncProgress.page / fullSyncProgress.totalPages) * 100)}%` : '...'}
                </span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Baixar Histórico</span>
              </>
            )}
          </button>

          <Link 
            to="/admin/whatsapp" 
            className="wab-switch-btn"
            title="Alternar para o WhatsApp da Loja Amoreja"
          >
            <MessageSquare size={14} />
            <span>WhatsApp Loja</span>
          </Link>

          <div 
            className="wab-conn-pill"
            onClick={() => setIsConnModalOpen(true)}
            title="Clique para gerenciar conexão ou ler QR Code"
          >
            <span className={`wab-conn-dot ${connInfo.state === 'open' ? 'online' : 'offline'}`} />
            <span style={{ fontSize: '12px', fontWeight: 700 }}>
              {connInfo.state === 'open' ? 'Online' : 'Desconectado'}
            </span>
            <QrCode size={14} style={{ opacity: 0.8 }} />
          </div>
        </div>
      </header>

      {/* Banner de Progresso de Sincronização Completa */}
      {fullSyncProgress && (
        <div className="wab-sync-progress-banner">
          <div className="wab-sync-progress-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              {fullSyncProgress.active ? (
                <RefreshCw size={14} className="fa-spin" color="#008069" />
              ) : fullSyncProgress.error ? (
                <AlertCircle size={14} color="#dc2626" />
              ) : (
                <CheckCircle2 size={14} color="#008069" />
              )}
              <span>
                {fullSyncProgress.phase}{' '}
                {fullSyncProgress.active && fullSyncProgress.totalPages > 0
                  ? `(${fullSyncProgress.savedMessages.toLocaleString('pt-BR')} msgs salvas)`
                  : ''}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {fullSyncProgress.active ? (
                <button
                  type="button"
                  onClick={handleStopFullHistorySync}
                  style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: '6px', padding: '2px 10px', cursor: 'pointer', fontSize: '11.5px', fontWeight: 700 }}
                >
                  Parar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFullSyncProgress(null)}
                  style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '2px', display: 'flex' }}
                  title="Fechar aviso"
                >
                  <XIcon size={15} />
                </button>
              )}
            </div>
          </div>
          {fullSyncProgress.active && fullSyncProgress.totalPages > 0 && (
            <div className="wab-sync-progress-bar">
              <div
                className="wab-sync-progress-fill"
                style={{ width: `${Math.min(100, Math.round((fullSyncProgress.page / fullSyncProgress.totalPages) * 100))}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── CORPO PRINCIPAL DE 2 COLUNAS ── */}
      <div className={`wab-layout ${selectedJid ? 'chat-active' : ''}`}>
        
        {/* ── COLUNA ESQUERDA: LISTA DE CONVERSAS ── */}
        <aside className="wab-sidebar">
          {/* Header da Sidebar */}
          <div className="wab-sidebar-header">
            <div className="wab-user-profile">
              <Avatar name="Márcia Reggiani" jidKey="marcia" size={40} />
              <div className="wab-user-name">
                <span>Márcia Reggiani</span>
                <span className="wab-user-badge">Conta Comercial</span>
              </div>
            </div>

            <div className="wab-header-actions">
              <button 
                type="button"
                onClick={() => setIsReportsOpen(true)}
                className="wab-icon-action" 
                title="Central de Inteligência & Relatórios (Instagram, Mídias, Leads)"
                style={{ color: '#008069' }}
              >
                <Sparkles size={18} />
              </button>
              <button 
                type="button"
                onClick={async () => { setSyncing(true); await loadAllChats(); checkConnectionStatus(); setSyncing(false); }}
                className="wab-icon-action" 
                title="Sincronizar e atualizar conversas"
                disabled={syncing}
              >
                <RefreshCw size={18} className={syncing ? 'fa-spin' : ''} />
              </button>
              <button 
                type="button"
                onClick={() => setIsConnModalOpen(true)}
                className="wab-icon-action" 
                title="Conectar / QR Code"
              >
                <QrCode size={18} color={connInfo.state === 'open' ? '#008069' : '#ea580c'} />
              </button>
            </div>
          </div>

          {/* Barra de Pesquisa */}
          <div className="wab-search-box">
            <div className="wab-search-inner">
              <Search size={16} color="#667781" />
              <input 
                type="text" 
                className="wab-search-input"
                placeholder="Pesquisar ou começar uma nova conversa"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667781', padding: 0 }}
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filtros em Pílulas (WhatsApp Business) */}
          <div className="wab-filter-bar">
            <button 
              type="button" 
              className={`wab-filter-pill ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Tudo ({chats.length})
            </button>
            <button 
              type="button" 
              className={`wab-filter-pill ${filterType === 'unread' ? 'active' : ''}`}
              onClick={() => setFilterType('unread')}
            >
              Não lidas ({chats.filter(c => c.unreadCount > 0).length})
            </button>
            <button 
              type="button" 
              className={`wab-filter-pill ${filterType === 'contacts' ? 'active' : ''}`}
              onClick={() => setFilterType('contacts')}
            >
              Contatos ({chats.filter(c => !c.isGroup).length})
            </button>
            <button 
              type="button" 
              className={`wab-filter-pill ${filterType === 'groups' ? 'active' : ''}`}
              onClick={() => setFilterType('groups')}
            >
              Grupos ({chats.filter(c => c.isGroup).length})
            </button>
            <button 
              type="button"
              className={`wab-select-toggle-btn ${isSelectMode ? 'active' : ''}`}
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                if (isSelectMode) setSelectedChatJids([]);
              }}
              title="Selecionar várias conversas para relatório em lote"
            >
              <CheckSquare size={13} />
              <span>{isSelectMode ? 'Cancelar' : 'Selecionar'}</span>
            </button>
          </div>

          {/* Lista de Conversas com Scroll */}
          <div
            className="wab-chat-list"
            onScroll={(e) => {
              const el = e.currentTarget;
              if (el.scrollHeight - el.scrollTop - el.clientHeight < 220) {
                setVisibleChatsCount((prev) => (prev < filteredChats.length ? prev + 150 : prev));
              }
            }}
          >
            {loadingChats && chats.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#667781' }}>
                <RefreshCw size={26} className="fa-spin" style={{ color: '#008069', margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Carregando conversas do WhatsApp...</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#667781', fontSize: '13.5px' }}>
                Nenhuma conversa encontrada neste filtro.
              </div>
            ) : (
              <>
                {filteredChats.slice(0, visibleChatsCount).map(c => {
                const isSelected = selectedJid === c.remoteJid;
                const isUnread = c.unreadCount > 0;
                return (
                  <div 
                    key={c.remoteJid}
                    ref={isSelected ? selectedItemRef : null}
                    className={`wab-chat-item ${isSelected ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                    onClick={() => {
                      if (isSelectMode) {
                        if (selectedChatJids.includes(c.remoteJid)) {
                          setSelectedChatJids(selectedChatJids.filter(j => j !== c.remoteJid));
                        } else {
                          setSelectedChatJids([...selectedChatJids, c.remoteJid]);
                        }
                      } else {
                        setSelectedJid(c.remoteJid);
                      }
                    }}
                  >
                    {isSelectMode && (
                      <input 
                        type="checkbox" 
                        className="wab-chat-checkbox"
                        checked={selectedChatJids.includes(c.remoteJid)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (selectedChatJids.includes(c.remoteJid)) {
                            setSelectedChatJids(selectedChatJids.filter(j => j !== c.remoteJid));
                          } else {
                            setSelectedChatJids([...selectedChatJids, c.remoteJid]);
                          }
                        }}
                      />
                    )}

                    <div className="wab-chat-avatar-wrap">
                      <Avatar name={c.name} picUrl={c.profilePicUrl} jidKey={c.remoteJid} size={48} />
                    </div>

                    <div className="wab-chat-details">
                      <div className="wab-chat-row-top">
                        <span className="wab-chat-title">{c.name}</span>
                        {c.timestamp && (
                          <span className="wab-chat-time">
                            {formatMessageTime(c.timestamp)}
                          </span>
                        )}
                      </div>

                      <div className="wab-chat-row-bottom">
                        <span className="wab-chat-snippet">
                          {c.isFromMe && <CheckCheck size={14} color="#53bdeb" style={{ flexShrink: 0 }} />}
                          <span>{c.lastMessage}</span>
                        </span>
                        {isUnread && (
                          <span className="wab-unread-badge">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

                {filteredChats.length > visibleChatsCount && (
                  <div style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #f2f5f7' }}>
                    <button
                      type="button"
                      className="wab-load-older-btn"
                      onClick={() => setVisibleChatsCount((prev) => prev + 150)}
                    >
                      Mostrar mais conversas ({filteredChats.length - visibleChatsCount} restantes)
                    </button>
                  </div>
                )}
              </>
            )}

            {isSelectMode && selectedChatJids.length > 0 && (
              <div className="wab-multi-select-floating-bar">
                <span><strong>{selectedChatJids.length}</strong> selecionadas</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    type="button" 
                    onClick={() => setSelectedChatJids([])}
                    style={{ background: 'transparent', border: '1px solid #475569', color: '#fff', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}
                  >
                    Limpar
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsReportsOpen(true)}
                    style={{ background: '#008069', border: 'none', color: '#fff', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Sparkles size={13} />
                    <span>Relatório ({selectedChatJids.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── COLUNA DIREITA: CONVERSA SELECIONADA ── */}
        <main className="wab-chat-panel">
          {selectedJid && activeChat ? (
            <>
              {/* Header do Chat Ativo */}
              <div className="wab-chat-header">
                <div className="wab-chat-header-contact">
                  <button 
                    type="button" 
                    className="wab-icon-action" 
                    onClick={() => setSelectedJid(null)}
                    title="Voltar"
                    style={{ marginRight: '-4px' }}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <Avatar name={activeChat.name} picUrl={activeChat.profilePicUrl} jidKey={activeChat.remoteJid} size={40} />
                  <div className="wab-chat-header-info">
                    <span className="wab-chat-header-name">{activeChat.name}</span>
                    <span className="wab-chat-header-status">
                      {isAiMode
                        ? '✨ Assistente Gemini Ativo'
                        : `${activeChat.isGroup ? 'Grupo do WhatsApp' : 'online'}${chatTotalMessages > 0 ? ` • ${chatTotalMessages.toLocaleString('pt-BR')} mensagens salvas` : ''}`}
                    </span>
                  </div>
                </div>

                <div className="wab-chat-header-tools">
                  <button 
                    type="button" 
                    className="wab-report-action-btn"
                    onClick={() => setIsReportsOpen(true)}
                    title="Gerar Relatório, extrair Instagrams e biblioteca de mídias desta conversa"
                    style={{ marginRight: '4px' }}
                  >
                    <Sparkles size={14} color="#008069" />
                    <span>Relatório & Mídias</span>
                  </button>
                  <button 
                    type="button"
                    className="wab-icon-action"
                    onClick={() => setIsAiMode(!isAiMode)}
                    title={isAiMode ? "Voltar para mensagens normais" : "Abrir Assistente IA"}
                    style={{ color: isAiMode ? '#008069' : '#54656f', background: isAiMode ? '#e7fce3' : 'transparent' }}
                  >
                    <Bot size={20} />
                  </button>
                  <button 
                    type="button"
                    className="wab-icon-action"
                    onClick={() => loadHistory(activeChat.remoteJid)}
                    title="Atualizar mensagens"
                  >
                    <RefreshCw size={18} className={loadingMessages ? 'fa-spin' : ''} />
                  </button>
                  <button type="button" className="wab-icon-action" title="Opções">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              {/* Feed com Balões de Conversa e Fundo com Doodle Oficial */}
              <div className="wab-chat-feed" ref={chatFeedRef}>
                <div className="wab-doodle-bg" />

                {/* Banner Modo IA */}
                {isAiMode && (
                  <div style={{ position: 'relative', zIndex: 3, background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 10px' }}>
                    <Sparkles size={16} color="#008069" />
                    <span><strong>Assistente IA da Márcia:</strong> Envie perguntas para a IA analisar as mensagens trocadas com <strong>{activeChat.name}</strong>.</span>
                  </div>
                )}

                {hasMoreOlder && !loadingMessages && (
                  <div className="wab-load-older-bar">
                    <button
                      type="button"
                      className="wab-load-older-btn"
                      onClick={() => handleLoadOlderMessages(false)}
                      disabled={loadingOlderMessages}
                    >
                      {loadingOlderMessages ? <RefreshCw size={13} className="fa-spin" /> : <Clock size={13} />}
                      <span>
                        {loadingOlderMessages
                          ? 'Carregando mensagens antigas...'
                          : `Carregar +200 antigas (${waMessages.length.toLocaleString('pt-BR')} de ${chatTotalMessages.toLocaleString('pt-BR')})`}
                      </span>
                    </button>
                    {chatTotalMessages - waMessages.length <= 2500 && (
                      <button
                        type="button"
                        className="wab-load-older-btn"
                        onClick={() => handleLoadOlderMessages(true)}
                        disabled={loadingOlderMessages}
                      >
                        Carregar todas ({chatTotalMessages.toLocaleString('pt-BR')})
                      </button>
                    )}
                  </div>
                )}

                {loadingMessages ? (
                  <div style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#667781' }}>
                    <RefreshCw size={24} className="fa-spin" style={{ color: '#008069', marginRight: '10px' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Carregando mensagens da conversa...</span>
                  </div>
                ) : waMessages.length === 0 ? (
                  <div style={{ position: 'relative', zIndex: 3, textAlign: 'center', padding: '40px 20px', color: '#667781' }}>
                    <div className="wab-date-separator">
                      <span className="wab-date-pill">HOJE</span>
                    </div>
                    <p style={{ fontSize: '13px', marginTop: '12px' }}>
                      As mensagens são protegidas com a criptografia de ponta a ponta do WhatsApp.
                    </p>
                  </div>
                ) : (
                  waMessages.map((msg, idx) => {
                    const prevMsg = waMessages[idx - 1];
                    const currentDateLabel = getMessageDateLabel(msg.created_at);
                    const prevDateLabel = prevMsg ? getMessageDateLabel(prevMsg.created_at) : null;
                    const showDateSeparator = currentDateLabel !== prevDateLabel;
                    const mediaCaption =
                      msg.raw_message?.message?.imageMessage?.caption ||
                      msg.raw_message?.message?.videoMessage?.caption ||
                      msg.raw_message?.message?.documentMessage?.fileName ||
                      '';
                    const showStandaloneContent = Boolean(msg.content) && (!msg.raw_message || msg.content !== mediaCaption);

                    return (
                      <React.Fragment key={msg.id || idx}>
                        {showDateSeparator && (
                          <div className="wab-date-separator">
                            <span className="wab-date-pill">{currentDateLabel}</span>
                          </div>
                        )}

                        <div className={`wab-msg-row ${msg.from_me ? 'out' : 'in'}`}>
                          <div className="wab-msg-card">
                            {msg.sender_name && !msg.from_me && activeChat.isGroup && (
                              <span className="wab-msg-sender-name" style={{ color: getColor(msg.sender_name) }}>
                                {msg.sender_name}
                              </span>
                            )}

                            {/* Renderizador de Mídia Completo (Vídeo, Áudio, Foto, Doc) */}
                            {msg.raw_message ? (
                              <WhatsAppMediaMessage 
                                rawMessage={msg.raw_message} 
                                messageId={msg.id} 
                                fromMe={msg.from_me}
                                senderName={msg.sender_name}
                                senderJid={msg.sender_jid}
                                timestamp={msg.created_at}
                                onOpenLightbox={setLightboxData}
                              />
                            ) : msg.preview_url ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {msg.message_type === 'video' ? (
                                  <video src={msg.preview_url} controls style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '6px' }} />
                                ) : (
                                  <img 
                                    src={msg.preview_url} 
                                    alt="Mídia" 
                                    style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer' }} 
                                    onClick={() => setLightboxData({ type: 'image', url: msg.preview_url, caption: msg.content })}
                                  />
                                )}
                              </div>
                            ) : null}

                            {/* Conteúdo de Texto */}
                            {showStandaloneContent && (
                              <div className="wab-msg-content">{msg.content}</div>
                            )}

                            <span className="wab-msg-bottom-meta">
                              <span>{formatMessageTime(msg.created_at)}</span>
                              {msg.from_me && <CheckCheck size={14} color="#53bdeb" />}
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}

                {/* Mensagens do Modo IA */}
                {aiMessages.map(m => (
                  <div key={m.id} className={`wab-msg-row ${m.sender === 'admin' ? 'out' : 'in'}`}>
                    <div className="wab-msg-card" style={{ borderLeft: m.sender === 'admin' ? 'none' : '4px solid #008069' }}>
                      <span className="wab-msg-sender-name" style={{ color: '#008069' }}>
                        {m.sender === 'admin' ? 'Pergunta Márcia' : '✨ Resposta IA Gemini'}
                      </span>
                      <div className="wab-msg-content">{m.message}</div>
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Preview de Anexo Selecionado */}
              {attachFile && (
                <div style={{ background: '#f8fafc', padding: '10px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: '#1e293b' }}>
                    {attachFile.type === 'image' && <ImageIcon size={20} color="#008069" />}
                    {attachFile.type === 'video' && <Film size={20} color="#008069" />}
                    {attachFile.type === 'document' && <FileText size={20} color="#008069" />}
                    {attachFile.type === 'audio' && <Music size={20} color="#008069" />}
                    <strong>{attachFile.name}</strong>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setAttachFile(null)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                    title="Remover anexo"
                  >
                    <XIcon size={18} />
                  </button>
                </div>
              )}

              {/* Barra de Digitação e Envio */}
              <footer className="wab-footer">
                {/* Inputs ocultos para seleção de arquivos */}
                <input 
                  type="file" 
                  ref={fileInputImgRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={e => handleSelectFileInput(e, 'image')}
                />
                <input 
                  type="file" 
                  ref={fileInputVideoRef} 
                  style={{ display: 'none' }} 
                  accept="video/*"
                  onChange={e => handleSelectFileInput(e, 'video')}
                />
                <input 
                  type="file" 
                  ref={fileInputDocRef} 
                  style={{ display: 'none' }} 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                  onChange={e => handleSelectFileInput(e, 'document')}
                />
                <input 
                  type="file" 
                  ref={fileInputAudioRef} 
                  style={{ display: 'none' }} 
                  accept="audio/*"
                  onChange={e => handleSelectFileInput(e, 'audio')}
                />

                {/* Popover de Opções de Anexo */}
                {isAttachMenuOpen && (
                  <div className="wab-attach-popover">
                    <button 
                      type="button" 
                      className="wab-attach-option"
                      onClick={() => fileInputImgRef.current?.click()}
                    >
                      <div className="wab-attach-circle" style={{ background: '#007bfc' }}>
                        <ImageIcon size={18} />
                      </div>
                      <span>Fotos & Imagens</span>
                    </button>

                    <button 
                      type="button" 
                      className="wab-attach-option"
                      onClick={() => fileInputVideoRef.current?.click()}
                    >
                      <div className="wab-attach-circle" style={{ background: '#ea580c' }}>
                        <Film size={18} />
                      </div>
                      <span>Vídeos</span>
                    </button>

                    <button 
                      type="button" 
                      className="wab-attach-option"
                      onClick={() => fileInputDocRef.current?.click()}
                    >
                      <div className="wab-attach-circle" style={{ background: '#7c3aed' }}>
                        <FileText size={18} />
                      </div>
                      <span>Documentos</span>
                    </button>

                    <button 
                      type="button" 
                      className="wab-attach-option"
                      onClick={() => fileInputAudioRef.current?.click()}
                    >
                      <div className="wab-attach-circle" style={{ background: '#db2777' }}>
                        <Music size={18} />
                      </div>
                      <span>Áudios</span>
                    </button>
                  </div>
                )}

                {isRecordingAudio ? (
                  /* Modo Gravador de Voz ao Vivo */
                  <div className="wab-recorder-active-bar">
                    <div className="wab-recording-indicator">
                      <span className="wab-recording-dot" />
                      <span className="wab-recording-time">{formatSeconds(recordingSeconds)}</span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>Gravando mensagem de voz...</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button 
                        type="button"
                        className="wab-icon-action" 
                        onClick={() => stopRecordingAudio(false)}
                        title="Cancelar gravação"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={20} />
                      </button>

                      <button 
                        type="button"
                        className="wab-send-btn" 
                        onClick={() => stopRecordingAudio(true)}
                        title="Enviar mensagem de voz"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Modo de Digitação Normal */
                  <>
                    <button 
                      type="button" 
                      className="wab-icon-action" 
                      title="Emojis"
                      onClick={() => chatInputRef.current?.focus({ preventScroll: true })}
                    >
                      <Smile size={22} color="#54656f" />
                    </button>

                    <button 
                      type="button" 
                      className="wab-icon-action" 
                      onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                      title="Anexar arquivos (Foto, Vídeo, Documento)"
                      style={{ transform: isAttachMenuOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.15s ease' }}
                    >
                      <Paperclip size={20} color={isAttachMenuOpen ? '#008069' : '#54656f'} />
                    </button>

                    <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                      <div className="wab-footer-input-wrap">
                        <input 
                          type="text" 
                          ref={chatInputRef}
                          className="wab-text-area"
                          placeholder={isAiMode ? "Pergunte à IA sobre esta conversa..." : "Mensagem"}
                          value={inputMessage}
                          onChange={e => setInputMessage(e.target.value)}
                        />
                      </div>

                      {inputMessage.trim() || attachFile ? (
                        <button 
                          type="submit" 
                          className="wab-send-btn"
                          title="Enviar Mensagem"
                          style={{ marginLeft: '10px' }}
                        >
                          <Send size={18} />
                        </button>
                      ) : (
                        <button 
                          type="button" 
                          className="wab-icon-action"
                          onClick={startRecordingAudio}
                          title="Gravar mensagem de voz"
                          style={{ marginLeft: '6px' }}
                        >
                          <Mic size={22} color="#54656f" />
                        </button>
                      )}
                    </form>
                  </>
                )}
              </footer>
            </>
          ) : (
            /* Estado Inicial: Nenhuma Conversa Selecionada */
            <div className="wab-empty-view">
              <div style={{ width: '84px', height: '84px', background: '#e7fce3', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008069', marginBottom: '16px' }}>
                <Smartphone size={44} />
              </div>
              <h2>WhatsApp Business Web</h2>
              <p>
                Envie e receba mensagens, fotos, vídeos, áudios e documentos. Gerencie todo o seu histórico salvo no aplicativo:{' '}
                <strong>{chats.length.toLocaleString('pt-BR')} conversas</strong> e{' '}
                <strong>{totalArchivedMessages.toLocaleString('pt-BR')} mensagens arquivadas</strong>.
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button 
                  type="button"
                  onClick={() => setIsConnModalOpen(true)}
                  className="btn btn-primary"
                  style={{ background: '#008069', borderColor: '#008069', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', fontSize: '14.5px', fontWeight: 700 }}
                >
                  <QrCode size={18} />
                  <span>{connInfo.state === 'open' ? 'Aparelho Conectado (Márcia)' : 'Conectar Aparelho / QR Code'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartFullHistorySync}
                  disabled={Boolean(fullSyncProgress?.active)}
                  className="btn"
                  style={{ background: '#ffffff', border: '1px solid #008069', color: '#008069', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14.5px', fontWeight: 700, borderRadius: '8px', cursor: 'pointer' }}
                >
                  <Download size={18} />
                  <span>{fullSyncProgress?.active ? 'Sincronizando Histórico...' : 'Atualizar / Baixar Histórico Completo'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '36px', color: '#8696a0', fontSize: '13px' }}>
                <Lock size={13} />
                <span>Protegido com a criptografia de ponta a ponta</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Lightbox de Mídia Fullscreen com Navegação e Zoom */}
      {lightboxData && (
        <div className="wab-lightbox-backdrop" onClick={() => { setLightboxData(null); setLightboxZoom(1); setLightboxRotate(0); }}>
          {/* Barra Superior */}
          <div className="wab-lightbox-topbar" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                {lightboxData.sender || (activeChat ? activeChat.name : 'Visualizador de Mídia')}
              </span>
              {lightboxData.date && (
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {new Date(lightboxData.date).toLocaleString('pt-BR')}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Controles de Zoom e Rotação para Imagens */}
              {lightboxData.type === 'image' && (
                <>
                  <button 
                    type="button" 
                    className="wab-icon-action" 
                    style={{ color: '#ffffff' }}
                    onClick={() => setLightboxZoom(prev => Math.min(3, prev + 0.3))}
                    title="Aumentar zoom (+)"
                  >
                    <ZoomIn size={19} />
                  </button>
                  <button 
                    type="button" 
                    className="wab-icon-action" 
                    style={{ color: '#ffffff' }}
                    onClick={() => setLightboxZoom(prev => Math.max(1, prev - 0.3))}
                    title="Diminuir zoom (-)"
                  >
                    <ZoomOut size={19} />
                  </button>
                  <button 
                    type="button" 
                    className="wab-icon-action" 
                    style={{ color: '#ffffff' }}
                    onClick={() => setLightboxRotate(prev => (prev + 90) % 360)}
                    title="Girar imagem"
                  >
                    <RotateCw size={18} />
                  </button>
                </>
              )}

              {/* Botão de Download */}
              {lightboxData.url && (
                <a 
                  href={lightboxData.url} 
                  download={lightboxData.type === 'video' ? `whatsapp_video_${Date.now()}.mp4` : `whatsapp_foto_${Date.now()}.jpg`}
                  className="wab-icon-action" 
                  style={{ color: '#ffffff' }}
                  title="Baixar mídia"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download size={20} />
                </a>
              )}

              {/* Botão Fechar */}
              <button 
                type="button" 
                className="wab-icon-action" 
                onClick={() => { setLightboxData(null); setLightboxZoom(1); setLightboxRotate(0); }}
                style={{ color: '#ffffff' }}
                title="Fechar (Esc)"
              >
                <XIcon size={24} />
              </button>
            </div>
          </div>

          {/* Botões de Navegação Anterior / Próxima Mídia */}
          {chatMediaList.length > 1 && (
            <>
              <button 
                type="button" 
                className="wab-lightbox-nav-btn prev"
                onClick={(e) => { e.stopPropagation(); handleLightboxNav('prev'); }}
                title="Mídia anterior (Seta esquerda)"
              >
                <ChevronLeft size={28} />
              </button>
              <button 
                type="button" 
                className="wab-lightbox-nav-btn next"
                onClick={(e) => { e.stopPropagation(); handleLightboxNav('next'); }}
                title="Próxima mídia (Seta direita)"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          {/* Centro: Imagem ou Vídeo */}
          <div className="wab-lightbox-center" onClick={e => e.stopPropagation()}>
            {lightboxData.type === 'video' && lightboxData.url ? (
              <video 
                src={lightboxData.url} 
                controls 
                autoPlay
                className="wab-lightbox-video"
              />
            ) : (
              <img 
                src={lightboxData.url || lightboxData.thumb} 
                alt="Visualização" 
                className="wab-lightbox-img" 
                style={{
                  transform: `scale(${lightboxZoom}) rotate(${lightboxRotate}deg)`,
                  transition: 'transform 0.15s ease'
                }}
              />
            )}
          </div>

          {/* Legenda */}
          {lightboxData.caption && (
            <div className="wab-lightbox-caption" onClick={e => e.stopPropagation()}>
              {lightboxData.caption}
            </div>
          )}
        </div>
      )}

      {/* Central de Inteligência, Extração de Instagram & Biblioteca de Mídias */}
      <WhatsAppReportsModal 
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        allChats={chats}
        activeChat={activeChat}
        activeMessages={waMessages}
        selectedChatJids={selectedChatJids}
        apiUrl={EVO_MARCIA_URL}
        apiKey={EVO_MARCIA_API_KEY}
        instanceName={EVO_MARCIA_INSTANCE}
        onOpenMediaLightbox={(mediaItem) => {
          setIsReportsOpen(false);
          setLightboxData(mediaItem);
        }}
      />

      {/* Modal de Conexão WhatsApp Márcia */}
      <WhatsAppConnectionModal 
        isOpen={isConnModalOpen}
        onClose={() => { setIsConnModalOpen(false); checkConnectionStatus(); }}
        onStatusChange={({ state, instance }) => {
          setConnInfo(prev => ({
            ...prev,
            state,
            number: instance?.number || prev.number,
            profileName: instance?.profileName || prev.profileName
          }));
        }}
        instanceName={EVO_MARCIA_INSTANCE}
        apiKey={EVO_MARCIA_API_KEY}
        apiUrl={EVO_MARCIA_URL}
      />
    </div>
  );
}
