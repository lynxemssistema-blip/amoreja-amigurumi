// src/utils/dataCache.js
// Cache em memória e sessionStorage para navegação instantânea sem recarregamento de páginas

const memoryCache = new Map();

/**
 * Obtém dados do cache se disponíveis
 * @param {string} key 
 * @returns {any|null}
 */
export const getCachedData = (key) => {
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  try {
    const sessionItem = sessionStorage.getItem(`amoreja_cache_${key}`);
    if (sessionItem) {
      const parsed = JSON.parse(sessionItem);
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch (_) {}
  return null;
};

/**
 * Salva dados no cache
 * @param {string} key 
 * @param {any} data 
 */
export const setCachedData = (key, data) => {
  if (data === undefined || data === null) return;
  memoryCache.set(key, data);
  try {
    sessionStorage.setItem(`amoreja_cache_${key}`, JSON.stringify(data));
  } catch (_) {}
};

/**
 * Invalida ou limpa o cache
 * @param {string} [key] 
 */
export const clearCachedData = (key) => {
  if (key) {
    memoryCache.delete(key);
    try {
      sessionStorage.removeItem(`amoreja_cache_${key}`);
    } catch (_) {}
  } else {
    memoryCache.clear();
    try {
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('amoreja_cache_')) {
          sessionStorage.removeItem(k);
        }
      });
    } catch (_) {}
  }
};
