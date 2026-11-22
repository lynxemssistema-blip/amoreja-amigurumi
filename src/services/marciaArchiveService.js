import { supabase, isSupabaseConfigured } from '../supabaseClient';

const safeJsonResponse = async (res, fallback = null) => {
  try {
    if (!res || !res.ok) return fallback;
    const text = await res.text();
    if (!text || !text.trim()) return fallback;
    return JSON.parse(text);
  } catch {
    return fallback;
  }
};

const sanitizeText = (str) => {
  if (str == null) return null;
  return String(str).replace(/\u0000/g, '');
};

export const formatMarciaJid = (jid = '') => {
  const str = String(jid || '');
  const n = str.split('@')[0].split(':')[0];
  if (str.includes('@g.us')) return 'Grupo do WhatsApp';
  return n.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, '+55 ($1) $2-$3') || n || str;
};

export const unwrapWaMessage = (msg) => {
  let cur = msg;
  for (let i = 0; i < 4 && cur && typeof cur === 'object'; i++) {
    if (cur.ephemeralMessage?.message) cur = cur.ephemeralMessage.message;
    else if (cur.viewOnceMessage?.message) cur = cur.viewOnceMessage.message;
    else if (cur.viewOnceMessageV2?.message) cur = cur.viewOnceMessageV2.message;
    else if (cur.viewOnceMessageV2Extension?.message) cur = cur.viewOnceMessageV2Extension.message;
    else if (cur.documentWithCaptionMessage?.message) cur = cur.documentWithCaptionMessage.message;
    else break;
  }
  return cur;
};

const normalizeFileLength = (rawLen) => {
  if (rawLen == null) return null;
  if (typeof rawLen === 'object') {
    const n = Number(rawLen.low ?? 0);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(rawLen);
  return Number.isFinite(n) ? n : null;
};

const normalizeThumb = (thumb) => {
  if (!thumb) return undefined;
  if (typeof thumb === 'string') return thumb;
  if (typeof thumb === 'object') {
    const vals = Object.values(thumb);
    if (vals.length > 0 && vals.every((v) => typeof v === 'number')) {
      let binary = '';
      for (let i = 0; i < vals.length; i++) binary += String.fromCharCode(vals[i]);
      return btoa(binary);
    }
  }
  return undefined;
};

const MEDIA_KEEP_KEYS = [
  'url',
  'directPath',
  'mediaKey',
  'fileSha256',
  'fileEncSha256',
  'fileLength',
  'mimetype',
  'caption',
  'seconds',
  'ptt',
  'fileName',
  'jpegThumbnail',
  'width',
  'height',
  'mediaKeyTimestamp'
];

const buildCompactMediaObj = (mediaObj) => {
  const clean = {};
  for (const k of MEDIA_KEEP_KEYS) {
    if (mediaObj[k] === undefined || mediaObj[k] === null) continue;
    if (k === 'jpegThumbnail') {
      const t = normalizeThumb(mediaObj.jpegThumbnail);
      if (t) clean.jpegThumbnail = t;
    } else if (k === 'caption' || k === 'fileName' || k === 'mimetype' || k === 'url' || k === 'directPath') {
      clean[k] = sanitizeText(mediaObj[k]);
    } else {
      clean[k] = mediaObj[k];
    }
  }
  return clean;
};

export const extractWaMessageRow = (m) => {
  const remoteJid = m?.key?.remoteJid;
  const messageId = m?.key?.id;
  if (!remoteJid || !messageId || remoteJid === 'status@broadcast') return null;

  const tsRaw = m.messageTimestamp?.low ?? m.messageTimestamp;
  const ts = Number(tsRaw || 0);
  if (!ts || !Number.isFinite(ts) || ts <= 0) return null;

  const inner = unwrapWaMessage(m.message);
  if (!inner || typeof inner !== 'object') return null;

  const textContent = inner.conversation || inner.extendedTextMessage?.text || '';
  let mediaKey = null;
  let messageType = 'text';

  if (inner.imageMessage) {
    mediaKey = 'imageMessage';
    messageType = 'image';
  } else if (inner.videoMessage) {
    mediaKey = 'videoMessage';
    messageType = 'video';
  } else if (inner.audioMessage) {
    mediaKey = 'audioMessage';
    messageType = 'audio';
  } else if (inner.documentMessage) {
    mediaKey = 'documentMessage';
    messageType = 'document';
  } else if (inner.stickerMessage) {
    mediaKey = 'stickerMessage';
    messageType = 'sticker';
  }

  if (!textContent && !mediaKey) return null;

  const mediaObj = mediaKey ? inner[mediaKey] : null;
  const compactMedia = mediaObj ? buildCompactMediaObj(mediaObj) : null;
  const content = sanitizeText(textContent || mediaObj?.caption || mediaObj?.fileName || '') || '';

  return {
    message_id: sanitizeText(messageId),
    remote_jid: sanitizeText(remoteJid),
    sender_name: sanitizeText(m.pushName || (m.key.fromMe ? 'Márcia' : null)),
    sender_jid: sanitizeText(m.key.participant || remoteJid),
    from_me: Boolean(m.key.fromMe),
    message_type: messageType,
    content,
    media_mime: mediaObj?.mimetype ? sanitizeText(mediaObj.mimetype) : null,
    media_seconds: mediaObj?.seconds != null ? Math.round(Number(mediaObj.seconds) || 0) : null,
    media_file_name: mediaObj?.fileName ? sanitizeText(mediaObj.fileName) : null,
    media_file_length: normalizeFileLength(mediaObj?.fileLength),
    raw_message: compactMedia
      ? {
          key: {
            id: sanitizeText(messageId),
            remoteJid: sanitizeText(remoteJid),
            fromMe: Boolean(m.key.fromMe),
            ...(m.key.participant ? { participant: sanitizeText(m.key.participant) } : {})
          },
          message: { [mediaKey]: compactMedia },
          messageTimestamp: ts
        }
      : null,
    created_at: new Date(ts * 1000).toISOString()
  };
};

export const dbRowToUiMessage = (row, fallbackChatName = '') => {
  return {
    id: row.message_id || row.id,
    content: row.content || '',
    from_me: Boolean(row.from_me),
    sender_name: row.sender_name || (row.from_me ? 'Márcia' : fallbackChatName || null),
    sender_jid: row.sender_jid || row.remote_jid,
    created_at: row.created_at,
    raw_message: row.raw_message || null,
    message_type: row.message_type || 'text',
    media_mime: row.media_mime || null,
    media_file_name: row.media_file_name || null,
    media_seconds: row.media_seconds || null,
    media_file_length: row.media_file_length || null,
    remoteJid: row.remote_jid,
    chatName: fallbackChatName || formatMarciaJid(row.remote_jid)
  };
};

const MSG_SELECT_FIELDS =
  'message_id, remote_jid, sender_name, sender_jid, from_me, message_type, content, media_mime, media_seconds, media_file_name, media_file_length, raw_message, created_at';

export const fetchAllArchivedMarciaChats = async () => {
  if (!isSupabaseConfigured()) return [];

  const allRows = [];
  const PAGE_SIZE = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('new_amoreja_marcia_chats')
      .select(
        'remote_jid, name, push_name, profile_pic_url, is_group, last_message, last_from_me, last_message_at, unread_count, message_count'
      )
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.warn('[marciaArchive] Erro ao listar chats salvos:', error.message);
      break;
    }

    const batch = Array.isArray(data) ? data : [];
    allRows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows.map((c) => ({
    id: c.remote_jid,
    remoteJid: c.remote_jid,
    name: c.name || c.push_name || (c.is_group ? 'Grupo do WhatsApp' : formatMarciaJid(c.remote_jid)),
    pushName: c.push_name || null,
    profilePicUrl: c.profile_pic_url || null,
    lastMessage: c.last_message || 'Mensagem',
    timestamp: c.last_message_at || null,
    unreadCount: c.unread_count || 0,
    messageCount: c.message_count || 0,
    isGroup: Boolean(c.is_group),
    isFromMe: Boolean(c.last_from_me)
  }));
};

export const fetchArchiveTotalMessagesCount = async () => {
  if (!isSupabaseConfigured()) return 0;
  try {
    const { count, error } = await supabase
      .from('new_amoreja_marcia_messages')
      .select('message_id', { count: 'exact' })
      .limit(1);
    if (error) return 0;
    return Number(count || 0);
  } catch {
    return 0;
  }
};

export const fetchArchivedMessagesForChat = async (remoteJid, { offset = 0, limit = 200 } = {}) => {
  if (!isSupabaseConfigured() || !remoteJid) {
    return { messages: [], total: 0 };
  }

  const pageSize = Math.min(limit, 1000);
  const { data, count, error } = await supabase
    .from('new_amoreja_marcia_messages')
    .select(MSG_SELECT_FIELDS, { count: 'exact' })
    .eq('remote_jid', remoteJid)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.warn('[marciaArchive] Erro ao carregar mensagens do chat:', error.message);
    return { messages: [], total: 0 };
  }

  const chronological = [...(data || [])].reverse().map((row) => dbRowToUiMessage(row));
  return {
    messages: chronological,
    total: Number(count || 0)
  };
};

async function fetchPagedRows(buildQuery, maxRows = 1500) {
  const collected = [];
  const PAGE = 1000;
  let offset = 0;

  while (collected.length < maxRows) {
    const batchLimit = Math.min(PAGE, maxRows - collected.length);
    const { data, error } = await buildQuery().range(offset, offset + batchLimit - 1);
    if (error) {
      console.warn('[marciaArchive] Erro na consulta paginada:', error.message);
      break;
    }
    const rows = Array.isArray(data) ? data : [];
    collected.push(...rows);
    if (rows.length < batchLimit) break;
    offset += rows.length;
  }

  return collected;
}

export const fetchArchivedMessagesForReport = async ({
  selectedChatJids = [],
  activeChat = null,
  allChats = [],
  searchKeyword = '',
  limit = 1500
} = {}) => {
  if (!isSupabaseConfigured()) return [];

  const chatNameMap = new Map((allChats || []).map((c) => [c.remoteJid, c.name || c.remoteJid]));
  const kw = (searchKeyword || '').trim();
  let rows = [];

  if (selectedChatJids.length > 0) {
    const targetJids = selectedChatJids.slice(0, 50);
    const targetLimit = Math.max(limit, 2000);
    const chunkSize = 20;
    const jidChunks = [];
    for (let i = 0; i < targetJids.length; i += chunkSize) {
      jidChunks.push(targetJids.slice(i, i + chunkSize));
    }

    const perChunkLimit = Math.ceil(targetLimit / jidChunks.length);
    for (const chunk of jidChunks) {
      const part = await fetchPagedRows(() => {
        let q = supabase
          .from('new_amoreja_marcia_messages')
          .select(MSG_SELECT_FIELDS)
          .in('remote_jid', chunk)
          .order('created_at', { ascending: false });
        if (kw) q = q.ilike('content', `%${kw}%`);
        return q;
      }, perChunkLimit);
      rows.push(...part);
    }
  } else if (activeChat?.remoteJid) {
    rows = await fetchPagedRows(() => {
      let q = supabase
        .from('new_amoreja_marcia_messages')
        .select(MSG_SELECT_FIELDS)
        .eq('remote_jid', activeChat.remoteJid)
        .order('created_at', { ascending: false });
      if (kw) q = q.ilike('content', `%${kw}%`);
      return q;
    }, limit);
  } else {
    rows = await fetchPagedRows(() => {
      let q = supabase
        .from('new_amoreja_marcia_messages')
        .select(MSG_SELECT_FIELDS)
        .order('created_at', { ascending: false });
      if (kw) q = q.ilike('content', `%${kw}%`);
      return q;
    }, limit);
  }

  // Deduplica por message_id e ordena cronologicamente (ascendente)
  const uniqueMap = new Map();
  for (const r of rows) {
    uniqueMap.set(r.message_id, r);
  }

  return Array.from(uniqueMap.values())
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-Math.max(limit, selectedChatJids.length > 0 ? 2000 : limit))
    .map((row) => dbRowToUiMessage(row, chatNameMap.get(row.remote_jid) || formatMarciaJid(row.remote_jid)));
};

export const upsertMarciaMessagesBatch = async (rows) => {
  if (!isSupabaseConfigured() || !Array.isArray(rows) || rows.length === 0) return 0;

  const map = new Map();
  for (const r of rows) {
    if (r?.message_id) map.set(r.message_id, r);
  }
  const unique = Array.from(map.values());
  const CHUNK = 100;

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('new_amoreja_marcia_messages')
      .upsert(chunk, { onConflict: 'message_id' });
    if (error) {
      throw new Error(`Erro ao salvar lote de mensagens: ${error.message}`);
    }
  }

  return unique.length;
};

export const upsertMarciaChatsBatch = async (chatRows) => {
  if (!isSupabaseConfigured() || !Array.isArray(chatRows) || chatRows.length === 0) return 0;

  const map = new Map();
  for (const c of chatRows) {
    if (c?.remote_jid && c.remote_jid !== 'status@broadcast') {
      map.set(c.remote_jid, c);
    }
  }
  const unique = Array.from(map.values());
  const CHUNK = 150;

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('new_amoreja_marcia_chats')
      .upsert(chunk, { onConflict: 'remote_jid' });
    if (error) {
      throw new Error(`Erro ao salvar conversas: ${error.message}`);
    }
  }

  return unique.length;
};

const rowPreviewSnippet = (row) => {
  const txt = (row.content || '').trim();
  if (txt) return txt.slice(0, 160);
  if (row.message_type === 'image') return '📷 Imagem';
  if (row.message_type === 'audio') return '🎵 Áudio';
  if (row.message_type === 'video') return '🎥 Vídeo';
  if (row.message_type === 'document') return `📄 ${row.media_file_name || 'Documento'}`;
  if (row.message_type === 'sticker') return '🎨 Figurinha';
  return 'Mensagem';
};

export const syncLatestMessagesForSingleChat = async ({
  remoteJid,
  evoUrl,
  evoApiKey,
  evoInstance,
  fallbackChatName = '',
  limit = 60
}) => {
  if (!remoteJid || !evoUrl || !evoApiKey || !evoInstance) return [];

  const res = await fetch(`${evoUrl}/chat/findMessages/${evoInstance}`, {
    method: 'POST',
    headers: { apikey: evoApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ where: { key: { remoteJid } }, limit })
  });

  if (!res.ok) return [];
  const raw = await safeJsonResponse(res, []);
  const recs = Array.isArray(raw) ? raw : (raw?.messages?.records || raw?.records || []);

  const rows = [];
  for (const m of recs) {
    const row = extractWaMessageRow(m);
    if (row) rows.push(row);
  }

  if (rows.length > 0) {
    upsertMarciaMessagesBatch(rows).catch(() => {});
  }

  return rows
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((r) => dbRowToUiMessage(r, fallbackChatName));
};

export const syncMarciaFullHistoryInApp = async ({
  evoUrl,
  evoApiKey,
  evoInstance,
  onProgress,
  signal
}) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase não configurado.');
  }

  const notify = (payload) => {
    if (typeof onProgress === 'function') onProgress(payload);
  };

  notify({
    active: true,
    page: 0,
    totalPages: 0,
    savedMessages: 0,
    totalRemoteMessages: 0,
    phase: 'Carregando lista de contatos e conversas...'
  });

  const [contactsRes, chatsRes] = await Promise.all([
    fetch(`${evoUrl}/chat/findContacts/${evoInstance}`, {
      method: 'POST',
      headers: { apikey: evoApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal
    }),
    fetch(`${evoUrl}/chat/findChats/${evoInstance}`, {
      method: 'POST',
      headers: { apikey: evoApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal
    })
  ]);

  const contactsRaw = await safeJsonResponse(contactsRes, []);
  const chatsRaw = await safeJsonResponse(chatsRes, []);
  const contactsList = Array.isArray(contactsRaw)
    ? contactsRaw
    : (contactsRaw?.records || contactsRaw?.contacts || []);
  const chatsList = Array.isArray(chatsRaw)
    ? chatsRaw
    : (chatsRaw?.records || chatsRaw?.chats || []);

  const contactMeta = new Map();
  for (const c of contactsList) {
    const jid = c.remoteJid || c.id;
    if (!jid || jid === 'status@broadcast') continue;
    contactMeta.set(jid, {
      pushName: sanitizeText(c.pushName || c.name || null),
      profilePicUrl: sanitizeText(c.profilePicUrl || null)
    });
  }

  const chatMap = new Map();
  for (const c of chatsList) {
    const remoteJid = c.remoteJid || c.id;
    if (!remoteJid || remoteJid === 'status@broadcast' || !String(remoteJid).includes('@')) continue;
    const isGroup = remoteJid.includes('@g.us');
    const cMeta = contactMeta.get(remoteJid);
    const pushName = sanitizeText(c.pushName || c.name || cMeta?.pushName || null);
    const lmInner = unwrapWaMessage(c.lastMessage?.message);
    const preview = sanitizeText(
      lmInner?.conversation ||
        lmInner?.extendedTextMessage?.text ||
        (lmInner?.imageMessage
          ? '📷 Imagem'
          : lmInner?.audioMessage
            ? '🎵 Áudio'
            : lmInner?.videoMessage
              ? '🎥 Vídeo'
              : lmInner?.documentMessage
                ? '📄 Documento'
                : 'Mensagem')
    );
    const lmTs = c.lastMessage?.messageTimestamp?.low ?? c.lastMessage?.messageTimestamp;
    const lastAt = c.updatedAt || (lmTs ? new Date(Number(lmTs) * 1000).toISOString() : null);

    chatMap.set(remoteJid, {
      remote_jid: sanitizeText(remoteJid),
      name: pushName || (isGroup ? 'Grupo do WhatsApp' : formatMarciaJid(remoteJid)),
      push_name: pushName,
      profile_pic_url: sanitizeText(c.profilePicUrl || cMeta?.profilePicUrl || null),
      is_group: isGroup,
      last_message: preview || 'Mensagem',
      last_from_me: Boolean(c.lastMessage?.key?.fromMe),
      last_message_at: lastAt,
      unread_count: Number(c.unreadCount || 0) || 0,
      message_count: 0,
      updated_at: new Date().toISOString()
    });
  }

  // Paginar todas as mensagens em lotes de 250
  const OFFSET = 250;
  let totalPages = 1;
  let totalRemoteMessages = 0;
  let savedMessages = 0;
  const chatStats = new Map(); // remoteJid -> { count, latestAt, latestSnippet, latestFromMe, pushName }
  let aborted = false;

  for (let page = 1; page <= totalPages; page++) {
    if (signal?.aborted) {
      aborted = true;
      break;
    }

    const res = await fetch(`${evoUrl}/chat/findMessages/${evoInstance}`, {
      method: 'POST',
      headers: { apikey: evoApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ where: {}, page, offset: OFFSET }),
      signal
    });

    if (!res.ok) {
      throw new Error(`Falha ao baixar página ${page} (${res.status})`);
    }

    const data = await safeJsonResponse(res, {});
    const meta = data?.messages || {};
    if (page === 1) {
      totalPages = Math.max(1, Number(meta.pages || 1));
      totalRemoteMessages = Number(meta.total || 0);
    }

    const records = Array.isArray(data) ? data : (meta.records || data?.records || []);
    const batchRows = [];
    const seenIds = new Set();

    for (const m of records) {
      const row = extractWaMessageRow(m);
      if (!row || seenIds.has(row.message_id)) continue;
      seenIds.add(row.message_id);
      batchRows.push(row);

      const prev = chatStats.get(row.remote_jid) || {
        count: 0,
        latestAt: null,
        latestSnippet: null,
        latestFromMe: false,
        pushName: null
      };
      prev.count += 1;
      if (!row.from_me && !row.remote_jid.includes('@g.us') && row.sender_name && !prev.pushName) {
        prev.pushName = row.sender_name;
      }
      if (!prev.latestAt || new Date(row.created_at) > new Date(prev.latestAt)) {
        prev.latestAt = row.created_at;
        prev.latestSnippet = rowPreviewSnippet(row);
        prev.latestFromMe = row.from_me;
      }
      chatStats.set(row.remote_jid, prev);
    }

    if (batchRows.length > 0) {
      const written = await upsertMarciaMessagesBatch(batchRows);
      savedMessages += written;
    }

    notify({
      active: true,
      page,
      totalPages,
      savedMessages,
      totalRemoteMessages,
      phase: `Baixando página ${page} de ${totalPages}...`
    });
  }

  notify({
    active: true,
    page: totalPages,
    totalPages,
    savedMessages,
    totalRemoteMessages,
    phase: 'Atualizando índice de conversas no banco...'
  });

  // Garantir chat existente com contagens exatas quando concluiu sem abortar
  for (const [jid, stat] of chatStats.entries()) {
    const existing = chatMap.get(jid);
    const isGroup = jid.includes('@g.us');
    const cMeta = contactMeta.get(jid);
    if (existing) {
      if (!aborted) {
        existing.message_count = Math.max(existing.message_count || 0, stat.count);
      }
      if (stat.latestAt && (!existing.last_message_at || new Date(stat.latestAt) >= new Date(existing.last_message_at))) {
        existing.last_message_at = stat.latestAt;
        existing.last_message = stat.latestSnippet || existing.last_message;
        existing.last_from_me = stat.latestFromMe;
      }
    } else {
      const bestPush = cMeta?.pushName || stat.pushName || null;
      chatMap.set(jid, {
        remote_jid: jid,
        name: bestPush || (isGroup ? 'Grupo do WhatsApp' : formatMarciaJid(jid)),
        push_name: bestPush,
        profile_pic_url: cMeta?.profilePicUrl || null,
        is_group: isGroup,
        last_message: stat.latestSnippet || 'Mensagem',
        last_from_me: stat.latestFromMe,
        last_message_at: stat.latestAt,
        unread_count: 0,
        message_count: aborted ? 0 : stat.count,
        updated_at: new Date().toISOString()
      });
    }
  }

  await upsertChatsBatch(Array.from(chatMap.values()));

  return {
    aborted,
    savedMessages,
    totalPages,
    totalChats: chatMap.size
  };
};
