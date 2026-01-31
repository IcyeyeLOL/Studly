/**
 * Financial Command Center - single file for copy-paste into widget.
 * Uses miyagiAPI.post(endpoint, body) -> { success, data } and useStorage(key, initial, { scope: 'user' }).
 *
 * DEEP SPACE: All APIs (news, stock search, AI, social) first use Deep Space's miyagiAPI when available.
 * If Deep Space fails (e.g. "cost...user only has 0 remaining" = credits exhausted), we fall back to
 * YOUR backend when WIDGET_API_BASE is set.
 *
 * TO FIX NEWS IN DEEP SPACE: (1) Deploy this app (e.g. Vercel), (2) Add NEWS_API_KEY in project env vars,
 * (3) Set WIDGET_API_BASE below to your deployed URL (e.g. 'https://stock-tracker-xyz.vercel.app').
 *
 * LOCALHOST: Leave WIDGET_API_BASE empty; fallback calls same-origin /api/*.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

// Backend URL (optional).
// - Leave empty for localhost (same-origin /api/*)
// - For Deep Space: set to your deployed URL, e.g. const WIDGET_API_BASE = 'https://stock-tracker-xyz.vercel.app';
const WIDGET_API_BASE = 'https://stock-tracker-uo3z.vercel.app/';

function getApiBase() {
  return WIDGET_API_BASE;
}

function _buildApiUrl(path) {
  const url = path.startsWith('/') ? path : `/${path}`;
  if (url.startsWith('http')) return url;
  const base = getApiBase();
  if (base) {
    return `${base.replace(/\/$/, '')}${url}`;
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin + url;
  }
  return url;
}

async function _request(url, options = {}) {
  try {
    const fullUrl = _buildApiUrl(url);
    const res = await fetch(fullUrl, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || data.message || res.statusText };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'Request failed' };
  }
}

// Fallback: calls YOUR backend (same-origin on localhost, or WIDGET_API_BASE when set for Deep Space).
function _fallbackPost(endpoint, body = {}) {
  const b = body;
  if (endpoint === '/news-top-headlines') {
    const category = b.category || 'business';
    const country = b.country || 'us';
    const pageSize = b.pageSize || 50;
    return _request(`/api/news?category=${encodeURIComponent(category)}&country=${encodeURIComponent(country)}&pageSize=${pageSize}`).then(({ ok, data, error }) =>
      ok ? { success: true, data: { articles: (data && data.articles) || [] } } : { success: false, error: error || 'Request failed' }
    );
  }
  if (endpoint === '/news-search') {
    const q = b.q || b.query || '';
    const pageSize = b.pageSize || 20;
    return _request(`/api/news?q=${encodeURIComponent(q)}&pageSize=${pageSize}`).then(({ ok, data, error }) =>
      ok ? { success: true, data: { articles: (data && data.articles) || [] } } : { success: false, error: error || 'Request failed' }
    );
  }
  if (endpoint === '/generate-text') {
    const prompt = (b.messages && b.messages[0] && b.messages[0].content) ?? b.prompt ?? '';
    const model = b.model || 'gpt-4o-mini';
    return _request('/api/ai/generate', { method: 'POST', body: JSON.stringify({ prompt, model }) }).then(({ ok, data, error }) =>
      ok ? { success: true, data: { text: (data && data.text) || '' } } : { success: false, error: error || 'Request failed' }
    );
  }
  if (endpoint === '/search-stocks') {
    const query = b.term ?? b.query ?? '';
    return _request(`/api/stocks?query=${encodeURIComponent(query)}`).then(({ ok, data, error }) => {
      if (!ok) return { success: false, error: error || 'Request failed' };
      const symbols = (data && data.results) || [];
      return { success: true, data: { symbols } };
    });
  }
  if (endpoint === '/linkedin-search-profiles') {
    const q = String(b.query ?? b.name ?? b.q ?? '').trim();
    if (!q) return Promise.resolve({ success: false, error: 'query/name/q is required' });
    return _request('/api/social/linkedin', {
      method: 'POST',
      body: JSON.stringify({ query: q, name: q, q }),
    }).then(({ ok, data, error }) => {
      if (!ok) return { success: false, error: error || 'Request failed' };
      const profiles = (data && data.profiles) || (data && data.results) || [];
      const normalized = profiles.map((r) => ({ ...r, link: r.searchUrl || r.link || r.profileUrl, platform: 'linkedin' }));
      return { success: true, data: { profiles: normalized } };
    });
  }
  if (endpoint === '/youtube-search') {
    const q = b.q ?? b.query ?? '';
    const maxResults = b.maxResults ?? 20;
    return _request(`/api/social/youtube?q=${encodeURIComponent(q)}&maxResults=${maxResults}`).then(({ ok, data, error }) => {
      if (!ok) return { success: false, error: error || 'Request failed' };
      const results = (data && data.results) || [];
      const videos = results.map((r) => ({
        ...r,
        id: r.id || r.videoId || r.channelId,
        videoId: r.videoId,
        channelId: r.channelId,
        snippet: {
          title: r.name,
          channelTitle: r.channelTitle,
          channelId: r.channelId,
          description: r.description,
          publishedAt: r.publishedAt,
        },
        links: { watch: r.videoId ? `https://www.youtube.com/watch?v=${r.videoId}` : r.channelId ? `https://www.youtube.com/channel/${r.channelId}` : undefined },
      }));
      return { success: true, data: { videos } };
    });
  }
  if (endpoint === '/send-email') return Promise.resolve({ success: true });
  return Promise.resolve({ success: false, error: `Unknown endpoint: ${endpoint}` });
}

const deepSpace = typeof globalThis.miyagiAPI !== 'undefined';

// Normalize a single YouTube item (miyagi or API shape) to UI shape: { id, videoId, channelId, snippet }
function _normalizeYoutubeItem(item) {
  if (!item) return null;
  const videoId = item.videoId ?? item.id?.videoId;
  const channelId = item.channelId ?? item.id?.channelId ?? item.snippet?.channelId;
  const snippet = item.snippet ?? {};
  return {
    id: item.id?.videoId ?? item.id?.channelId ?? item.id ?? videoId ?? channelId ?? `yt-${Math.random().toString(36).slice(2)}`,
    videoId,
    channelId,
    snippet: {
      title: snippet.title ?? item.name ?? item.title ?? '',
      channelTitle: snippet.channelTitle ?? item.channelTitle ?? '',
      channelId: snippet.channelId ?? channelId,
      description: snippet.description ?? item.description ?? '',
      publishedAt: snippet.publishedAt ?? item.publishedAt ?? '',
    },
    links: {
      watch: videoId ? `https://www.youtube.com/watch?v=${videoId}` : channelId ? `https://www.youtube.com/channel/${channelId}` : undefined,
    },
  };
}

// Normalize Deep Space response so our UI always sees { success, data: { symbols } } etc.
function _normalizeResponse(endpoint, res) {
  if (!res || !res.success || !res.data) return res;
  const d = res.data;
  if (endpoint === '/search-stocks' && !d.symbols && Array.isArray(d.results)) {
    return { success: true, data: { ...d, symbols: d.results } };
  }
  if ((endpoint === '/news-top-headlines' || endpoint === '/news-search') && !d.articles && Array.isArray(d.results)) {
    return { success: true, data: { ...d, articles: d.results } };
  }
  // Miyagi /youtube-search: ensure data.videos exists and items match UI shape
  if (endpoint === '/youtube-search') {
    const raw = d.videos ?? d.results ?? d.items ?? [];
    const videos = Array.isArray(raw) ? raw.map(_normalizeYoutubeItem).filter(Boolean) : [];
    return { success: true, data: { ...d, videos } };
  }
  // Miyagi /linkedin-search-profiles: ensure data.profiles exists (API may return profiles or results)
  if (endpoint === '/linkedin-search-profiles') {
    const raw = d.profiles ?? d.results ?? [];
    const profiles = Array.isArray(raw) ? raw.map((p) => ({ ...p, link: p.searchUrl || p.link || p.profileUrl, platform: 'linkedin' })) : [];
    return { success: true, data: { ...d, profiles } };
  }
  return res;
}

const miyagiAPI = {
  post: async (endpoint, body = {}) => {
    // In Deep Space, YouTube search is not provided by miyagi - always use user's backend when set
    if (endpoint === '/youtube-search' && getApiBase()) {
      return _fallbackPost(endpoint, body);
    }
    if (deepSpace) {
      try {
        const res = await globalThis.miyagiAPI.post(endpoint, body);
        const normalized = _normalizeResponse(endpoint, res);
        if (normalized && normalized.success) return normalized;
        // Deep Space failed or doesn't support this endpoint; try user's backend if URL is set
        if (getApiBase()) return _fallbackPost(endpoint, body);
        return normalized || res;
      } catch (e) {
        if (getApiBase()) return _fallbackPost(endpoint, body);
        return { success: false, error: (e && e.message) || 'Request failed' };
      }
    }
    return _fallbackPost(endpoint, body);
  },
};

/** Fix UTF-8 mojibake (e.g. Ã¢â‚¬" instead of â€”) so text displays correctly on simple page / any encoding. */
function fixMojibake(str) {
  if (str == null || typeof str !== 'string') return '';
  return String(str)
    .replace(/\u00E2\u20AC\u201D/g, '-')
    .replace(/\u00E2\u20AC\u00A6/g, '...')
    .replace(/\u00E2\u20AC\u201C/g, '"')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2026/g, '...');
}

const useStorage = typeof globalThis.useStorage !== 'undefined' ? globalThis.useStorage : function useStorage(key, initialValue, opts) {
  const [storedValue, setStoredValue] = useState(initialValue);
  useEffect(() => {
    try {
      const item = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
      setStoredValue(item != null ? JSON.parse(item) : initialValue);
    } catch (err) {
      console.error('Error loading from localStorage:', err);
    }
  }, [key]);
  const setValue = (valueOrUpdater) => {
    if (typeof valueOrUpdater === 'function') {
      setStoredValue((prev) => {
        const nextValue = valueOrUpdater(prev);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, JSON.stringify(nextValue));
          }
        } catch (err) {
          console.error('Error saving to localStorage:', err);
        }
        return nextValue;
      });
    } else {
      try {
        setStoredValue(valueOrUpdater);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, JSON.stringify(valueOrUpdater));
        }
      } catch (err) {
        console.error('Error saving to localStorage:', err);
      }
    }
  };
  return [storedValue, setValue];
};

const SECTORS = [
  { id: 'technology', name: 'Technology', keywords: ['tech', 'software', 'AI', 'cloud', 'SaaS'] },
  { id: 'healthcare', name: 'Healthcare', keywords: ['pharma', 'biotech', 'medical', 'health'] },
  { id: 'finance', name: 'Finance', keywords: ['banking', 'financial', 'investment', 'trading'] },
  { id: 'energy', name: 'Energy', keywords: ['oil', 'gas', 'renewable', 'energy'] },
  { id: 'consumer', name: 'Consumer', keywords: ['retail', 'consumer', 'goods', 'brands'] },
  { id: 'industrial', name: 'Industrial', keywords: ['manufacturing', 'industrial', 'machinery'] },
  { id: 'real-estate', name: 'Real Estate', keywords: ['real estate', 'REIT', 'property'] },
  { id: 'materials', name: 'Materials', keywords: ['materials', 'chemicals', 'mining'] },
];

const CATALYSTS = [
  { id: 'earnings', name: 'Earnings', color: '#6366f1', keywords: ['earnings', 'revenue', 'profit', 'quarterly', 'EPS'] },
  { id: 'guidance', name: 'Guidance', color: '#10b981', keywords: ['guidance', 'forecast', 'outlook', 'expectations'] },
  { id: 'macro', name: 'Macro', color: '#f59e0b', keywords: ['Fed', 'inflation', 'interest rates', 'GDP', 'economic'] },
  { id: 'regulation', name: 'Regulation', color: '#ef4444', keywords: ['SEC', 'regulation', 'compliance', 'law', 'legal'] },
  { id: 'product', name: 'Product', color: '#8b5cf6', keywords: ['launch', 'release', 'product', 'unveil'] },
  { id: 'm-a', name: 'M&A', color: '#ec4899', keywords: ['merger', 'acquisition', 'deal', 'buyout'] },
];

const THEMES = {
  light: {
    bg: '#ffffff',
    text: '#0f172a',
    textMuted: '#475569',
    textMutedLight: '#94a3b8',
    border: '#e2e8f0',
    surface: '#ffffff',
    secondaryBg: '#f8fafc',
    secondaryBgAlt: '#f1f5f9',
    errorBg: '#fef2f2',
    errorText: '#b91c1c',
    primary: '#6B46C1',
    primaryHover: '#5b21b6',
  },
  dark: {
    bg: '#0f172a',
    text: '#f8fafc',
    textMuted: '#94a3b8',
    textMutedLight: '#64748b',
    border: '#334155',
    surface: '#1e293b',
    secondaryBg: '#1e293b',
    secondaryBgAlt: '#334155',
    errorBg: '#450a0a',
    errorText: '#fca5a5',
    primary: '#7c3aed',
    primaryHover: '#6b21a8',
  },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 4) return `${week}w ago`;
  return d.toLocaleDateString();
}

function FinancialCommandCenter() {
  const [themeMode, setThemeMode] = useStorage('financial.widgetTheme', 'light', { scope: 'user' });
  const theme = THEMES[themeMode] ?? THEMES.light;

  const [watchlist, setWatchlist] = useStorage('financial.watchlist', [], { scope: 'user' });
  const [customSectors, setCustomSectors] = useStorage('financial.customSectors', [], { scope: 'user' });
  const [positions, setPositions] = useStorage('financial.positions', {}, { scope: 'user' });
  const [stockInfo, setStockInfo] = useStorage('financial.stockInfo', {}, { scope: 'user' });
  const [tickerNotes, setTickerNotes] = useStorage('financial.tickerNotes', {}, { scope: 'user' });
  const [followedAccounts, setFollowedAccounts] = useStorage('financial.followedAccounts', [], { scope: 'user' });
  const [lastAlertCheck, setLastAlertCheck] = useStorage('financial.lastAlertCheck', null, { scope: 'user' });

  const [activeView, setActiveView] = useState('dashboard');
  const [news, setNews] = useState([]);
  const [newsError, setNewsError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSectors, setSelectedSectors] = useStorage('financial.selectedSectors', [], { scope: 'user' });
  const [selectedCatalysts, setSelectedCatalysts] = useStorage('financial.selectedCatalysts', [], { scope: 'user' });
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [tickerBrief, setTickerBrief] = useState(null);
  const [digest, setDigest] = useState(null);
  const [socialSearchPlatform, setSocialSearchPlatform] = useState('youtube');
  const [socialSearchQuery, setSocialSearchQuery] = useState('');
  const [socialResults, setSocialResults] = useState([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState(null);
  const [hasSocialSearched, setHasSocialSearched] = useState(false);
  const [linkedinTab, setLinkedinTab] = useState('people'); // 'people' | 'jobs' | 'companies'
  const [editingPosition, setEditingPosition] = useState(null);
  const [newTickerInput, setNewTickerInput] = useState('');
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorKeywords, setNewSectorKeywords] = useState('');
  const [positionForm, setPositionForm] = useState({ ticker: '', quantity: '', entryPrice: '' });
  const [portfolioSearchQuery, setPortfolioSearchQuery] = useState('');
  const [portfolioSearchResults, setPortfolioSearchResults] = useState([]);
  const [portfolioSearching, setPortfolioSearching] = useState(false);
  const [editingPositionData, setEditingPositionData] = useState({});
  const [refreshingQuotes, setRefreshingQuotes] = useState({});
  const [refreshingAllPortfolioPrices, setRefreshingAllPortfolioPrices] = useState(false);
  const [watchlistSearchQuery, setWatchlistSearchQuery] = useState('');
  const [watchlistSearchResults, setWatchlistSearchResults] = useState([]);
  const [watchlistSearchError, setWatchlistSearchError] = useState(null);
  const [watchlistSearching, setWatchlistSearching] = useState(false);
  const [watchlistQuotes, setWatchlistQuotes] = useState({});
  const [loadingWatchlistQuotes, setLoadingWatchlistQuotes] = useState({});
  const [hasSearched, setHasSearched] = useState(false);
  const [portfolioSearchError, setPortfolioSearchError] = useState(null);
  const [portfolioHasSearched, setPortfolioHasSearched] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState(null);

  // Price alerts (persistent rules + optional polling/email)
  const [priceAlertRules, setPriceAlertRules] = useStorage('financial.priceAlertRules', [], { scope: 'user' });
  const [priceAlertEvents, setPriceAlertEvents] = useStorage('financial.priceAlertEvents', [], { scope: 'user' });
  const [priceAlertPollingEnabled, setPriceAlertPollingEnabled] = useStorage('financial.priceAlertPollingEnabled', false, { scope: 'user' });
  const [priceAlertPollingMinutes, setPriceAlertPollingMinutes] = useStorage('financial.priceAlertPollingMinutes', 5, { scope: 'user' });
  const [priceAlertEmailEnabled, setPriceAlertEmailEnabled] = useStorage('financial.priceAlertEmailEnabled', false, { scope: 'user' });
  const [priceAlertEmail, setPriceAlertEmail] = useStorage('financial.priceAlertEmail', '', { scope: 'user' });
  const [priceAlertChecking, setPriceAlertChecking] = useState(false);
  const [priceAlertError, setPriceAlertError] = useState(null);
  const [priceAlertLastCheck, setPriceAlertLastCheck] = useState(null);
  const priceAlertCheckingRef = useRef(false);

  const [newPriceAlertTicker, setNewPriceAlertTicker] = useState('');
  const [newPriceAlertType, setNewPriceAlertType] = useState('above'); // above | below | pct_up | pct_down
  const [newPriceAlertThreshold, setNewPriceAlertThreshold] = useState('100');

  // Price alerts ticker search (same flow as watchlist/portfolio search)
  const [priceAlertTickerQuery, setPriceAlertTickerQuery] = useState('');
  const [priceAlertTickerResults, setPriceAlertTickerResults] = useState([]);
  const [priceAlertTickerSearching, setPriceAlertTickerSearching] = useState(false);

  useEffect(() => {
    const t = THEMES[themeMode] ?? THEMES.light;
    document.body.style.backgroundColor = t.bg;
    document.body.style.color = t.text;
    document.documentElement.style.minHeight = '100%';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      document.documentElement.style.minHeight = '';
    };
  }, [themeMode]);

  useEffect(() => {
    loadNews();
    checkAlerts({ updateTimestamp: false });
  }, []);

  // One-time migration: remove previously-seeded bogus ticker "500.PAR"
  useEffect(() => {
    try {
      const already = typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem('financial.migrated.remove_500_par')
        : null;
      if (already) return;
      const list = Array.isArray(watchlist) ? watchlist : [];
      if (list.includes('500.PAR')) {
        setWatchlist((prev) => (prev || []).filter((t) => t !== '500.PAR'));
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('financial.migrated.remove_500_par', '1');
      }
    } catch {}
  }, []);

  const allSectorsList = useMemo(
    () => [...SECTORS, ...(customSectors || [])],
    [customSectors]
  );

  useEffect(() => {
    // Reload news whenever sector filters change (including when cleared)
    loadNews();
  }, [selectedSectors, customSectors]);

  // Keep Alerts synced to the Dashboard news feed without changing "Last checked"
  useEffect(() => {
    if ((watchlist || []).length === 0) {
      setAlerts([]);
      return;
    }
    if (!Array.isArray(news) || news.length === 0) return;
    checkAlerts({ updateTimestamp: false });
  }, [watchlist, news]);

  useEffect(() => {
    if (!priceAlertPollingEnabled) return;
    const mins = Math.max(1, Math.min(60, Number(priceAlertPollingMinutes) || 5));
    const id = setInterval(() => {
      runPriceAlertCheck('poll');
    }, mins * 60 * 1000);
    runPriceAlertCheck('poll');
    return () => clearInterval(id);
  }, [priceAlertPollingEnabled, priceAlertPollingMinutes, priceAlertRules, priceAlertEmailEnabled, priceAlertEmail]);

  useEffect(() => {
    if (activeView !== 'portfolio') return;
    const tickers = [...new Set([...(watchlist || []), ...Object.keys(positions || {})])];
    const timeouts = [];
    tickers.forEach((ticker, i) => {
      timeouts.push(setTimeout(() => refreshQuote(ticker, true), i * 380));
    });
    return () => timeouts.forEach((t) => clearTimeout(t));
  }, [activeView, (watchlist || []).length, Object.keys(positions || {}).length]);

  useEffect(() => {
    if (activeView !== 'watchlist') return;
    const tickers = watchlist || [];
    const timeouts = [];
    tickers.forEach((ticker, i) => {
      timeouts.push(setTimeout(() => refreshWatchlistQuote(ticker), i * 380));
    });
    return () => timeouts.forEach((t) => clearTimeout(t));
  }, [activeView, (watchlist || []).length]);

  const loadNews = async () => {
    setLoading(true);
    setNewsError(null);
    try {
      let allNews = [];
      if ((selectedSectors || []).length === 0) {
        const response = await miyagiAPI.post('/news-top-headlines', {
          category: 'business',
          country: 'us',
          pageSize: 50,
        });
        if (response.success) {
          allNews = response.data.articles || [];
        } else {
          setNewsError(response.error || 'Failed to load news');
        }
      } else {
        const sectorQueries = (selectedSectors || [])
          .map((sectorId) => {
            const sector = allSectorsList.find((s) => s.id === sectorId);
            const keywords = sector && Array.isArray(sector.keywords) ? sector.keywords : [];
            return keywords.length ? keywords.join(' OR ') : '';
          })
          .filter(Boolean);
        for (const query of sectorQueries) {
          try {
            const response = await miyagiAPI.post('/news-search', {
              q: query,
              language: 'en',
              sortBy: 'publishedAt',
              pageSize: 20,
            });
            if (response.success && response.data.articles) {
              allNews = [...allNews, ...response.data.articles];
            }
          } catch (err) {
            console.error('Error loading sector news:', err);
          }
        }
      }
      const taggedNews = allNews.map((article) => ({
        ...article,
        catalysts: detectCatalysts(article),
      }));
      const uniqueNews = Array.from(
        new Map(taggedNews.map((item) => [item.url, item])).values()
      );
      setNews(uniqueNews);
    } catch (error) {
      console.error('Error loading news:', error);
      setNews([]);
      setNewsError((error && error.message) || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  const detectCatalysts = (article) => {
    const text = `${(article && article.title) || ''} ${(article && article.description) || ''}`.toLowerCase();
    return CATALYSTS.filter((catalyst) =>
      catalyst.keywords.some((keyword) => text.includes(keyword.toLowerCase()))
    ).map((c) => c.id);
  };

  const clusterStories = (articles) => {
    const clusters = {};
    (articles || []).forEach((article) => {
      const words = ((article && article.title) || '')
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 4);
      let bestCluster = null;
      let bestScore = 0;
      Object.keys(clusters).forEach((clusterKey) => {
        const clusterWords = clusterKey.split(' ');
        const matches = words.filter((w) => clusterWords.includes(w)).length;
        const score = matches / Math.max(clusterWords.length, words.length);
        if (score > 0.3 && score > bestScore) {
          bestScore = score;
          bestCluster = clusterKey;
        }
      });
      if (bestCluster) {
        clusters[bestCluster].push(article);
      } else {
        const keyWord = words[0] || 'other';
        if (!clusters[keyWord]) clusters[keyWord] = [];
        clusters[keyWord].push(article);
      }
    });
    return Object.entries(clusters)
      .map(([key, stories]) => ({
        key,
        stories,
        size: stories.length,
        topCatalysts: getTopCatalysts(stories),
      }))
      .sort((a, b) => b.size - a.size);
  };

  const getTopCatalysts = (stories) => {
    const catalystCounts = {};
    (stories || []).forEach((story) => {
      (story.catalysts || []).forEach((cat) => {
        catalystCounts[cat] = (catalystCounts[cat] || 0) + 1;
      });
    });
    return Object.entries(catalystCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  };

  const checkAlerts = async (opts = { updateTimestamp: true }) => {
    if ((watchlist || []).length === 0) {
      setAlerts([]);
      return;
    }
    try {
      const sourceNews = Array.isArray(news) ? news : [];
      const newStories = sourceNews.filter((article) => {
        const text = `${article.title} ${article.description || ''}`.toLowerCase();
        return (watchlist || []).some((ticker) => text.includes(String(ticker || '').toLowerCase()));
      });
      setAlerts(newStories);
      if (opts && opts.updateTimestamp) {
        setLastAlertCheck(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  };

  const _isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

  const _formatPriceRuleLabel = (rule) => {
    const t = String(rule.ticker || '').toUpperCase();
    const isPct = rule.type === 'pct_up' || rule.type === 'pct_down';
    const v = isPct ? `${rule.threshold}%` : `$${rule.threshold}`;
    if (rule.type === 'above') return `${t} above ${v}`;
    if (rule.type === 'below') return `${t} below ${v}`;
    if (rule.type === 'pct_up') return `${t} up ${v} (vs baseline)`;
    if (rule.type === 'pct_down') return `${t} down ${v} (vs baseline)`;
    return `${t} alert`;
  };

  const _fetchQuote = async (ticker) => {
    const symbol = String(ticker || '').trim().toUpperCase();
    if (!symbol) return { ok: false, error: 'Ticker is required' };
    const { ok, data, error } = await _request(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`, { method: 'GET' });
    if (!ok) return { ok: false, error: error || 'Quote request failed' };
    const price = Number(data && data.price);
    if (!Number.isFinite(price) || price <= 0) return { ok: false, error: `Invalid quote price for ${symbol}` };
    return { ok: true, quote: data };
  };

  const runPriceAlertCheck = async (reason = 'manual') => {
    if (priceAlertCheckingRef.current) return;
    priceAlertCheckingRef.current = true;
    setPriceAlertChecking(true);
    setPriceAlertError(null);
    try {
      const rules = Array.isArray(priceAlertRules) ? priceAlertRules : [];
      const enabled = rules.filter((r) => r && r.enabled);
      const nowIso = new Date().toISOString();
      const updated = rules.slice();
      const newEvents = [];

      for (const rule of enabled) {
        const q = await _fetchQuote(rule.ticker);
        if (!q.ok) {
          const msg = String(q.error || '');
          if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
            setPriceAlertError('Quote rate limit exceeded. Try again in ~60 seconds or reduce polling frequency.');
            break;
          }
          const idx = updated.findIndex((r) => r.id === rule.id);
          if (idx >= 0) updated[idx] = { ...updated[idx], lastCheckedAt: nowIso };
          continue;
        }

        const price = Number(q.quote.price || 0);
        const threshold = Number(rule.threshold || 0);
        const ref = typeof rule.referencePrice === 'number' ? rule.referencePrice : null;

        let triggered = false;
        let pctFromRef = null;
        if (rule.type === 'above') triggered = price >= threshold;
        if (rule.type === 'below') triggered = price <= threshold;
        if (rule.type === 'pct_up' || rule.type === 'pct_down') {
          if (ref && ref > 0) {
            pctFromRef = ((price - ref) / ref) * 100;
            const up = pctFromRef >= threshold;
            const down = (-pctFromRef) >= threshold;
            triggered = rule.type === 'pct_up' ? up : down;
          } else {
            triggered = false;
          }
        }

        const prevState = !!rule.lastState;
        const shouldFire = triggered && !prevState;
        const idx = updated.findIndex((r) => r.id === rule.id);
        if (idx >= 0) {
          updated[idx] = {
            ...updated[idx],
            lastCheckedAt: nowIso,
            lastPrice: price,
            lastChangePercentFromRef: pctFromRef,
            lastState: triggered,
            lastTriggeredAt: shouldFire ? nowIso : (updated[idx].lastTriggeredAt || null),
          };
        }

        if (shouldFire) {
          newEvents.push({
            id: `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ruleId: rule.id,
            ticker: String(rule.ticker || '').toUpperCase(),
            ruleLabel: _formatPriceRuleLabel(rule),
            price,
            triggeredAt: nowIso,
            referencePrice: ref,
            changePercentFromRef: pctFromRef,
          });
        }
      }

      if (newEvents.length > 0) {
        const nextEvents = [...newEvents, ...(Array.isArray(priceAlertEvents) ? priceAlertEvents : [])].slice(0, 50);
        setPriceAlertEvents(nextEvents);

        if (priceAlertEmailEnabled) {
          if (!_isValidEmail(priceAlertEmail)) {
            setPriceAlertError('Email alerts are enabled, but the email address is invalid.');
          } else {
            for (const evt of newEvents) {
              await _request('/api/email/alert', {
                method: 'POST',
                body: JSON.stringify({
                  email: String(priceAlertEmail || '').trim().toLowerCase(),
                  alert: {
                    ticker: evt.ticker,
                    ruleLabel: evt.ruleLabel,
                    price: evt.price,
                    triggeredAt: evt.triggeredAt,
                    referencePrice: evt.referencePrice ?? null,
                    changePercentFromRef: evt.changePercentFromRef ?? null,
                  },
                }),
              }).catch(() => null);
            }
          }
        }
      }

      setPriceAlertRules(updated);
      setPriceAlertLastCheck(nowIso);
    } catch (e) {
      setPriceAlertError((e && e.message) || 'Failed to check price alerts');
    } finally {
      setPriceAlertChecking(false);
      priceAlertCheckingRef.current = false;
    }
  };

  const addPriceAlertRule = async () => {
    const threshold = Number(newPriceAlertThreshold);
    const raw = String(newPriceAlertTicker || '');
    const tickers = Array.from(
      new Set(
        raw
          .split(/[\s,]+/)
          .map((t) => String(t || '').trim().toUpperCase())
          .filter(Boolean)
      )
    );

    if (tickers.length === 0) return;
    if (tickers.length > 10) {
      setPriceAlertError('Please add at most 10 tickers at a time (rate limits).');
      return;
    }
    if (!Number.isFinite(threshold) || threshold <= 0) {
      setPriceAlertError('Please enter a valid threshold.');
      return;
    }

    const rules = Array.isArray(priceAlertRules) ? priceAlertRules : [];
    const toAdd = [];
    const failures = [];
    setPriceAlertError(null);

    for (const ticker of tickers) {
      const dup = rules.some((r) => r && String(r.ticker || '').toUpperCase() === ticker && r.type === newPriceAlertType && Number(r.threshold) === threshold);
      if (dup) continue;

      let referencePrice = null;
      if (newPriceAlertType === 'pct_up' || newPriceAlertType === 'pct_down') {
        const q = await _fetchQuote(ticker);
        if (!q.ok) {
          failures.push(`${ticker}: ${q.error}`);
          continue;
        }
        referencePrice = Number(q.quote.price || 0);
        if (!referencePrice) {
          failures.push(`${ticker}: invalid quote price`);
          continue;
        }
      }

      toAdd.push({
        id: `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ticker,
        type: newPriceAlertType,
        threshold,
        enabled: true,
        createdAt: new Date().toISOString(),
        referencePrice,
        lastState: false,
        lastCheckedAt: null,
        lastTriggeredAt: null,
      });
    }

    if (toAdd.length === 0 && failures.length === 0) {
      setPriceAlertError('Those rules already exist.');
      return;
    }
    if (failures.length > 0) {
      setPriceAlertError(`Some tickers could not be added: ${failures.slice(0, 3).join(' | ')}${failures.length > 3 ? ' ...' : ''}`);
    }
    if (toAdd.length > 0) {
      setPriceAlertRules([...toAdd, ...rules]);
      setNewPriceAlertTicker('');
    }
  };

  const _appendTickerToPriceAlertInput = (symbol) => {
    const sym = String(symbol || '').trim().toUpperCase();
    if (!sym) return;
    const existing = Array.from(
      new Set(
        String(newPriceAlertTicker || '')
          .split(/[\s,]+/)
          .map((t) => String(t || '').trim().toUpperCase())
          .filter(Boolean)
      )
    );
    if (!existing.includes(sym)) existing.push(sym);
    setNewPriceAlertTicker(existing.join(', '));
  };

  const searchPriceAlertTickers = async () => {
    const q = String(priceAlertTickerQuery || '').trim();
    if (!q) return;
    setPriceAlertTickerSearching(true);
    setPriceAlertTickerResults([]);
    setPriceAlertError(null);
    try {
      const { ok, data, error } = await _request(`/api/stocks?query=${encodeURIComponent(q)}`, { method: 'GET' });
      if (!ok) {
        setPriceAlertError(error || 'Ticker search failed');
        return;
      }
      const results = (data && data.results) || [];
      setPriceAlertTickerResults(Array.isArray(results) ? results.slice(0, 25) : []);
    } catch (e) {
      setPriceAlertError((e && e.message) || 'Ticker search failed');
    } finally {
      setPriceAlertTickerSearching(false);
    }
  };

  const briefTicker = async (ticker) => {
    setLoading(true);
    setSelectedTicker(ticker);
    setActiveView('ticker');
    try {
      const newsResponse = await miyagiAPI.post('/news-search', {
        q: ticker,
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 10,
      });
      const tickerNews = newsResponse.success ? (newsResponse.data.articles || []) : [];
      const newsSummary = tickerNews
        .slice(0, 5)
        .map((a) => `- ${a.title}`)
        .join('\n');
      const briefResponse = await miyagiAPI.post('/generate-text', {
        model: 'gpt-4o-mini',
        prompt: `Provide a brief executive summary for ticker ${ticker} based on recent news:\n\n${newsSummary}\n\nInclude: 1) Key developments, 2) Why it matters, 3) Main catalysts, 4) Risks. Keep it concise (3-4 bullets).`,
      });
      const forecastResponse = await miyagiAPI.post('/generate-text', {
        model: 'gpt-4o-mini',
        prompt: `Based on the news above, provide three scenarios for ${ticker}:\n\n1. Bull Case (optimistic outcome)\n2. Base Case (most likely)\n3. Bear Case (pessimistic outcome)\n\nEach scenario should include a realistic price target and reasoning.`,
      });
      setTickerBrief({
        ticker,
        news: tickerNews,
        summary: briefResponse.success ? (briefResponse.data.text || 'Unable to generate summary.') : 'Unable to generate summary.',
        forecast: forecastResponse.success ? (forecastResponse.data.text || 'Unable to generate forecast.') : 'Unable to generate forecast.',
      });
    } catch (error) {
      console.error('Error generating brief:', error);
      setTickerBrief({
        ticker,
        news: [],
        summary: 'Error generating brief. Please try again.',
        forecast: 'Error generating forecast. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDigest = async () => {
    setLoading(true);
    try {
      const response = await miyagiAPI.post('/news-top-headlines', {
        category: 'business',
        country: 'us',
        pageSize: 50,
      });
      const articles = response.success ? (response.data.articles || []) : [];
      const topMovers = watchlist.slice(0, 5).map((ticker) => {
        const tickerNews = articles.filter((a) =>
          `${a.title} ${a.description || ''}`.toLowerCase().includes(ticker.toLowerCase())
        );
        return { ticker, newsCount: tickerNews.length };
      }).sort((a, b) => b.newsCount - a.newsCount);
      const digestPrompt = `Generate a daily market digest based on these headlines:\n\n${articles.slice(0, 20).map((a) => `- ${a.title}`).join('\n')}\n\nInclude: 1) Market summary, 2) Key movers (${topMovers.map((t) => t.ticker).join(', ')}), 3) Catalysts to watch, 4) Actionable insights. Format as a professional newsletter.`;
      const digestResponse = await miyagiAPI.post('/generate-text', {
        model: 'gpt-4o-mini',
        prompt: digestPrompt,
      });
      setDigest({
        date: new Date().toLocaleDateString(),
        content: digestResponse.success ? (digestResponse.data.text || 'Unable to generate digest.') : 'Unable to generate digest.',
        articles: articles.slice(0, 10),
      });
    } catch (error) {
      console.error('Error generating digest:', error);
      setDigest({
        date: new Date().toLocaleDateString(),
        content: 'Error generating digest. Please try again.',
        articles: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const addCustomSector = () => {
    if (!newSectorName.trim() || !newSectorKeywords.trim()) return;
    const newSector = {
      id: `custom-${Date.now()}`,
      name: newSectorName.trim(),
      keywords: newSectorKeywords.split(',').map((k) => k.trim()).filter(Boolean),
      custom: true,
    };
    setCustomSectors((prev) => [...(prev || []), newSector]);
    setNewSectorName('');
    setNewSectorKeywords('');
  };

  const deleteCustomSector = (sectorId) => {
    setCustomSectors((prev) => (prev || []).filter((s) => s.id !== sectorId));
    setSelectedSectors((prev) => prev.filter((s) => s !== sectorId));
  };

  const searchSocial = async () => {
    if (!socialSearchQuery.trim()) return;
    setSocialLoading(true);
    setSocialError(null);
    setHasSocialSearched(true);
    try {
      if (socialSearchPlatform === 'linkedin') {
        const response = await miyagiAPI.post('/linkedin-search-profiles', {
          query: socialSearchQuery.trim(),
          name: socialSearchQuery.trim(),
          q: socialSearchQuery.trim(),
        });
        if (response.success && response.data && Array.isArray(response.data.profiles)) {
          setSocialResults(response.data.profiles.map((profile, idx) => ({
            ...profile,
            id: profile.id || profile.link || profile.profileUrl || `linkedin-${(profile.name || '').replace(/\s/g, '-')}-${idx}`,
            platform: 'linkedin',
            name: profile.name || profile.headline || 'Unknown',
            headline: profile.headline,
            searchUrl: profile.searchUrl || profile.link || profile.profileUrl,
          })));
          setSocialError(null);
        } else {
          setSocialError(response.error || response.message || 'Failed to search LinkedIn profiles');
          setSocialResults([]);
        }
      } else if (socialSearchPlatform === 'youtube') {
        // Miyagi POST /youtube-search: Search YouTube videos
        const response = await miyagiAPI.post('/youtube-search', {
          q: socialSearchQuery,
          query: socialSearchQuery,
          maxResults: 20,
        });
        if (response.success && response.data && response.data.videos && response.data.videos.length >= 0) {
          const videos = response.data.videos;
          setSocialResults(videos.map((video, idx) => ({
            ...video,
            id: video.id?.videoId ?? video.id ?? video.videoId ?? `video-${idx}`,
            videoId: video.videoId ?? video.id?.videoId,
            channelId: video.channelId ?? video.id?.channelId ?? video.snippet?.channelId,
            snippet: video.snippet ?? {},
            platform: 'youtube',
          })));
          setSocialError(null);
        } else {
          const errorMsg = response.error || response.message || 'Failed to search YouTube';
          setSocialError(response.error || response.message || 'YouTube search failed. In Deep Space this uses miyagi /youtube-search.');
          setSocialResults([]);
        }
      }
    } catch (error) {
      console.error('Error searching social:', error);
      const errorMessage = error.message || error.toString();
      if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        setSocialError('YouTube API Error (400): Bad Request. Your YOUTUBE_API_KEY may be missing or invalid. Check your environment variables and ensure the key is set correctly.');
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setSocialError('YouTube API Error (403): Access Forbidden. Your API key may have incorrect restrictions. In Google Cloud Console -> Credentials -> API Key, set "Application restrictions" to "None" or "IP addresses" (not HTTP referrers, which block server requests).');
      } else if (errorMessage.includes('429')) {
        setSocialError('YouTube API Error (429): Quota exceeded. You have hit the daily API quota limit. Try again tomorrow or request a quota increase in Google Cloud Console.');
      } else {
        setSocialError(`Error: ${errorMessage}`);
      }
      setSocialResults([]);
    } finally {
      setSocialLoading(false);
    }
  };

  const followAccount = (account) => {
    const isFollowing = followedAccounts.some(
      (acc) => (acc.id === account.id || acc.id === account.snippet?.channelId) && acc.platform === account.platform
    );
    if (!isFollowing) {
      setFollowedAccounts((prev) => [...(prev || []), account]);
    }
  };

  const unfollowAccount = (accountId, platform) => {
    setFollowedAccounts((prev) =>
      (prev || []).filter(
        (acc) => !(acc.id === accountId && acc.platform === platform)
      )
    );
  };

  const searchWatchlistStocks = async () => {
    if (!watchlistSearchQuery.trim()) return;
    setWatchlistSearching(true);
    setWatchlistSearchError(null);
    setHasSearched(true);
    try {
      const response = await miyagiAPI.post('/search-stocks', {
        term: watchlistSearchQuery,
        query: watchlistSearchQuery,
      });
      if (response && response.success && response.data) {
        const list = Array.isArray(response.data.symbols) ? response.data.symbols : [];
        setWatchlistSearchResults(list);
      } else {
        setWatchlistSearchResults([]);
        setWatchlistSearchError((response && response.error) || 'Search failed. Check ALPHA_VANTAGE_KEY in .env.');
      }
    } catch (error) {
      console.error('Error searching stocks:', error);
      setWatchlistSearchResults([]);
      setWatchlistSearchError((error && error.message) || 'Search failed. Check your connection.');
    } finally {
      setWatchlistSearching(false);
    }
  };

  const getQuoteForResult = async (symbol) => {
    setLoadingWatchlistQuotes((prev) => ({ ...prev, [symbol]: true }));
    try {
      const mockQuote = {
        symbol,
        price: (Math.random() * 500 + 50).toFixed(2),
        change: (Math.random() * 20 - 10).toFixed(2),
        changePercent: (Math.random() * 10 - 5).toFixed(2),
        volume: Math.floor(Math.random() * 10000000),
        latestTradingDay: new Date().toISOString().split('T')[0],
      };
      setWatchlistQuotes((prev) => ({ ...prev, [symbol]: mockQuote }));
    } catch (error) {
      console.error('Error getting quote:', error);
    } finally {
      setLoadingWatchlistQuotes((prev) => ({ ...prev, [symbol]: false }));
    }
  };

  const addToWatchlistFromSearch = (symbol) => {
    const upperSymbol = symbol.toUpperCase();
    if (!watchlist.includes(upperSymbol)) {
      setWatchlist((prev) => [...(prev || []), upperSymbol]);
    }
  };

  const addFromWatchlistSearchResult = (result) => {
    const symbol = (result && result.symbol) || (typeof result === 'string' ? result : '');
    if (!symbol) return;
    const sym = String(symbol).toUpperCase();
    if ((watchlist || []).includes(sym)) {
      return;
    }
    setWatchlist((prev) => [...(prev || []), sym]);
    setStockInfo((prev) => ({
      ...(prev || {}),
      [sym]: {
        name: result.name || sym,
        region: result.region || undefined,
        currency: result.currency || undefined,
      },
    }));
    refreshWatchlistQuote(sym);
  };

  const addTickerToWatchlist = async () => {
    if (!newTickerInput.trim()) return;
    const ticker = newTickerInput.trim().toUpperCase();
    if (watchlist.includes(ticker)) {
      alert(`${ticker} is already in your watchlist.`);
      return;
    }
    try {
      const response = await miyagiAPI.post('/search-stocks', {
        term: ticker,
      });
      if (response.success && response.data && response.data.symbols && response.data.symbols.length > 0) {
        const found = response.data.symbols.find((r) => r && r.symbol && String(r.symbol).toUpperCase() === ticker);
        if (found) {
          setStockInfo((prev) => ({
            ...(prev || {}),
            [ticker]: {
              name: found.name || ticker,
              region: found.region || undefined,
              currency: found.currency || undefined,
            },
          }));
        }
        setWatchlist((prev) => [...(prev || []), ticker]);
        setNewTickerInput('');
        refreshQuote(ticker, true);
        refreshWatchlistQuote(ticker);
      } else {
        const confirmAdd = window.confirm(`Could not verify ticker ${ticker}. Add anyway?`);
        if (confirmAdd) {
          setWatchlist((prev) => [...(prev || []), ticker]);
          setNewTickerInput('');
          refreshQuote(ticker, true);
          refreshWatchlistQuote(ticker);
        }
      }
    } catch (error) {
      console.error('Error adding ticker:', error);
      const confirmAdd = window.confirm(`Error verifying ${ticker}. Add anyway?`);
      if (confirmAdd) {
        setWatchlist((prev) => [...(prev || []), ticker]);
        setNewTickerInput('');
        refreshQuote(ticker, true);
        refreshWatchlistQuote(ticker);
      }
    }
  };

  const refreshWatchlistQuote = async (ticker) => {
    setLoadingWatchlistQuotes((prev) => ({ ...prev, [ticker]: true }));
    try {
      const { ok, data } = await _request(`/api/stocks/quote?symbol=${encodeURIComponent(String(ticker).trim().toUpperCase())}`, { method: 'GET' });
      if (ok && data && Number.isFinite(Number(data.price))) {
        setWatchlistQuotes((prev) => ({ ...prev, [ticker]: data }));
      } else {
        setWatchlistQuotes((prev) => ({ ...prev, [ticker]: null }));
      }
    } catch (error) {
      console.error('Error refreshing watchlist quote:', error);
      setWatchlistQuotes((prev) => ({ ...prev, [ticker]: null }));
    } finally {
      setLoadingWatchlistQuotes((prev) => ({ ...prev, [ticker]: false }));
    }
  };

  const searchPortfolioTicker = async () => {
    if (!portfolioSearchQuery.trim()) return;
    setPortfolioSearching(true);
    setPortfolioSearchError(null);
    setPortfolioHasSearched(true);
    try {
      const response = await miyagiAPI.post('/search-stocks', {
        term: portfolioSearchQuery,
        query: portfolioSearchQuery,
      });
      if (response && response.success && response.data) {
        const list = Array.isArray(response.data.symbols) ? response.data.symbols : [];
        setPortfolioSearchResults(list);
      } else {
        setPortfolioSearchResults([]);
        setPortfolioSearchError((response && response.error) || 'Search failed. Check ALPHA_VANTAGE_KEY in .env.');
      }
    } catch (error) {
      console.error('Error searching stocks:', error);
      setPortfolioSearchResults([]);
      setPortfolioSearchError((error && error.message) || 'Search failed. Check your connection.');
    } finally {
      setPortfolioSearching(false);
    }
  };

  const addTickerToPortfolio = (ticker) => {
    if (!watchlist.includes(ticker)) {
      setWatchlist((prev) => [...(prev || []), ticker]);
    }
    setPortfolioSearchQuery('');
    setPortfolioSearchResults([]);
  };

  const addFromPortfolioSearchResult = (result) => {
    const symbol = (result && result.symbol) || (typeof result === 'string' ? result : '');
    if (!symbol) return;
    const sym = String(symbol).toUpperCase();
    if ((watchlist || []).includes(sym)) {
      alert(`${sym} is already in your portfolio.`);
      return;
    }
    setWatchlist((prev) => [...(prev || []), sym]);
    setStockInfo((prev) => ({
      ...(prev || {}),
      [sym]: {
        name: result.name || sym,
        region: result.region || undefined,
        currency: result.currency || undefined,
      },
    }));
    setPortfolioSearchQuery('');
    setPortfolioSearchResults([]);
    refreshQuote(sym, true);
  };

  const addPosition = (ticker, quantity, entryPrice) => {
    const tickerUpper = ticker.toUpperCase();
    setPositions((prev) => ({
      ...(prev || {}),
      [tickerUpper]: {
        quantity: parseFloat(quantity),
        entryPrice: parseFloat(entryPrice),
        currentPrice: parseFloat(entryPrice),
        notes: (tickerNotes || {})[tickerUpper] || '',
      },
    }));
    setEditingPosition(null);
    setEditingPositionData({});
  };

  const updatePosition = (ticker, updates) => {
    setPositions((prev) => ({
      ...(prev || {}),
      [ticker]: {
        ...((prev || {})[ticker] || {}),
        ...updates,
      },
    }));
  };

  const deletePosition = (ticker) => {
    setPositions((prev) => {
      const newPositions = { ...(prev || {}) };
      delete newPositions[ticker];
      return newPositions;
    });
    setTickerNotes((prev) => {
      const newNotes = { ...(prev || {}) };
      delete newNotes[ticker];
      return newNotes;
    });
  };

  const refreshQuote = async (ticker, updatePositionPrice = true) => {
    setRefreshingQuotes((prev) => ({ ...prev, [ticker]: true }));
    try {
      const { ok, data } = await _request(`/api/stocks/quote?symbol=${encodeURIComponent(String(ticker).trim().toUpperCase())}`, { method: 'GET' });
      if (ok && data && Number.isFinite(Number(data.price)) && Number(data.price) > 0) {
        if (updatePositionPrice) updatePosition(ticker, { currentPrice: Number(data.price) });
      }
    } catch (error) {
      console.error('Error refreshing quote:', error);
    } finally {
      setRefreshingQuotes((prev) => ({ ...prev, [ticker]: false }));
    }
  };

  const refreshAllPortfolioPrices = async () => {
    const tickers = Object.keys(positions || {}).filter((t) => (positions || {})[t]?.quantity);
    if (tickers.length === 0) return;
    setRefreshingAllPortfolioPrices(true);
    for (const ticker of tickers) {
      await refreshQuote(ticker, true);
      await new Promise((r) => setTimeout(r, 280));
    }
    setRefreshingAllPortfolioPrices(false);
  };

  const updateTickerNotes = (ticker, notes) => {
    setTickerNotes((prev) => ({
      ...(prev || {}),
      [ticker]: notes,
    }));
  };

  const openEmailModal = () => {
    if (!digest) return;
    setShowEmailModal(true);
    setEmailInput('');
    setEmailError(null);
  };

  const sendDigestEmail = async () => {
    if (!digest) return;
    const email = (emailInput || '').trim();
    if (!email) {
      setEmailError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError(null);
    setEmailLoading(true);
    try {
      const payload = {
        email: email.toLowerCase(),
        digest: {
          date: digest.date,
          content: digest.content,
          articles: (digest.articles || []).map((a) => ({ title: a.title || '', url: a.url || '' })),
        },
      };
      const { ok, data, error } = await _request('/api/email/digest', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (ok) {
        setShowEmailModal(false);
        setEmailInput('');
        alert('Digest sent! Check your inbox.');
      } else {
        setEmailError((data && (data.error || data.message)) || error || 'Failed to send. Add RESEND_API_KEY to .env for email.');
      }
    } catch (err) {
      console.error('Send digest email:', err);
      setEmailError('Failed to send. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  const filteredNews = useMemo(() => {
    let filtered = news;
    const cats = selectedCatalysts || [];
    if (cats.length > 0) {
      filtered = filtered.filter((article) =>
        article.catalysts?.some((cat) => cats.includes(cat))
      );
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((article) =>
        article.title?.toLowerCase().includes(query) ||
        article.description?.toLowerCase().includes(query)
      );
    }
    // Push articles without images towards the bottom
    return [...filtered].sort((a, b) =>
      (a.urlToImage ? 0 : 1) - (b.urlToImage ? 0 : 1)
    );
  }, [news, selectedCatalysts, searchQuery]);

  const clusteredNews = useMemo(() => clusterStories(filteredNews), [filteredNews]);

  const stats = useMemo(() => ({
    totalStories: news.length,
    watchlistSize: watchlist.length,
    alertsCount: alerts.length,
    catalystsFound: new Set(news.flatMap((n) => n.catalysts || [])).size,
  }), [news, watchlist, alerts]);

  const rootWrapStyle = {
    backgroundColor: theme.bg,
    color: theme.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", sans-serif',
    minHeight: '100%',
    width: '100%',
    isolation: 'isolate',
    overflow: 'auto',
  };

  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      minHeight: '600px',
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", sans-serif',
      overflow: 'hidden',
    },
    sidebar: {
      width: '280px',
      borderRight: `1px solid ${theme.border}`,
      padding: '32px 24px',
      overflowY: 'auto',
      backgroundColor: theme.bg,
    },
    mainContent: {
      flex: 1,
      overflowY: 'auto',
      padding: '40px',
      backgroundColor: theme.bg,
    },
    navButton: (isActive) => ({
      width: '100%',
      padding: '14px 16px',
      marginBottom: '8px',
      border: 'none',
      borderRadius: '10px',
      backgroundColor: isActive ? (theme.primary || '#6B46C1') : 'transparent',
      color: isActive ? '#ffffff' : theme.text,
      cursor: 'pointer',
      textAlign: 'left',
      fontSize: '15px',
      fontWeight: isActive ? '600' : '400',
      transition: 'all 0.2s',
    }),
    card: {
      padding: '32px',
      backgroundColor: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: '16px',
      marginBottom: '24px',
      boxShadow: themeMode === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.04)',
    },
    input: {
      width: '100%',
      padding: '14px 18px',
      border: `1px solid ${theme.border}`,
      borderRadius: '12px',
      fontSize: '15px',
      backgroundColor: theme.surface,
      color: theme.text,
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    button: (variant = 'primary') => ({
      padding: '12px 24px',
      backgroundColor: variant === 'primary' ? (theme.primary || '#6B46C1') : variant === 'danger' ? '#ef4444' : 'transparent',
      color: variant === 'primary' || variant === 'danger' ? '#ffffff' : theme.text,
      border: variant === 'ghost' ? `1px solid ${theme.border}` : 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '500',
      transition: 'all 0.2s',
    }),
  };

  return (
    <div id="financial-command-center-root" style={rootWrapStyle}>
      <style>{`
        #financial-command-center-root, #financial-command-center-root * { box-sizing: border-box; }
        #financial-command-center-root { background: ${theme.bg} !important; color: ${theme.text} !important; }
      `}</style>
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px', letterSpacing: '-0.02em', color: theme.text }}>
            News + Stock + Social Tracker
          </h1>
          <p style={{ fontSize: '14px', color: theme.textMuted, marginTop: '4px' }}>Track news, markets, and social profiles in one place.</p>
          <button
            type="button"
            onClick={() => setThemeMode((m) => (m === 'light' ? 'dark' : 'light'))}
            style={{
              marginTop: '12px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: '500',
              color: theme.text,
              backgroundColor: theme.secondaryBg,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {themeMode === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
        </div>

        <nav style={{ marginBottom: '32px' }}>
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'watchlist', label: 'Watchlist' },
            { id: 'alerts', label: 'Alerts' },
            { id: 'ticker', label: 'Ticker Detail' },
            { id: 'digest', label: 'Digest' },
            { id: 'social', label: 'Social' },
            { id: 'portfolio', label: 'Portfolio' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              style={styles.navButton(activeView === item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{
          padding: '20px',
          backgroundColor: theme.secondaryBg,
          borderRadius: '12px',
          marginBottom: '32px',
        }}>
          <div style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '16px', fontWeight: '500' }}>
            Real-Time Stats
          </div>
          <div style={{ fontSize: '13px', lineHeight: '2' }}>
            <div>Stories: <strong>{stats.totalStories}</strong></div>
            <div>Watchlist: <strong>{stats.watchlistSize}</strong></div>
            <div>Alerts: <strong>{stats.alertsCount}</strong></div>
            <div>Catalysts: <strong>{stats.catalystsFound}</strong></div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', color: theme.text }}>
            Catalysts
          </div>
          {CATALYSTS.map((catalyst) => (
            <label key={catalyst.id} style={{ display: 'block', marginBottom: '12px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={(selectedCatalysts || []).includes(catalyst.id)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedCatalysts((prev) => [...(prev || []), catalyst.id]);
                  else setSelectedCatalysts((prev) => (prev || []).filter((c) => c !== catalyst.id));
                }}
                style={{ marginRight: '10px' }}
              />
              <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: catalyst.color, borderRadius: 1, marginRight: 6, verticalAlign: 'middle' }} aria-hidden /> {catalyst.name}
            </label>
          ))}
        </div>
      </div>

      <div style={styles.mainContent}>
        <header style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${theme.border}` }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: theme.text, marginBottom: '4px' }}>News + Stock + Social Tracker</h1>
          <p style={{ fontSize: '14px', color: theme.textMuted, marginBottom: '16px' }}>Track news, markets, and social profiles in one place.</p>
          <nav style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {[
              { id: 'dashboard', label: 'News' },
              { id: 'watchlist', label: 'Stocks' },
              { id: 'social', label: 'Social' },
              { id: 'portfolio', label: 'Portfolio' },
              { id: 'alerts', label: 'Alerts' },
              { id: 'ticker', label: 'Ticker' },
              { id: 'digest', label: 'Digest' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                style={{
                  paddingBottom: '8px',
                  fontSize: '14px',
                  fontWeight: activeView === id ? '600' : '400',
                  color: activeView === id ? (theme.primary || '#6B46C1') : theme.textMuted,
                  border: 'none',
                  borderBottom: `2px solid ${activeView === id ? (theme.primary || '#6B46C1') : 'transparent'}`,
                  background: 'none',
                  cursor: 'pointer',
                  marginBottom: '-2px',
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        {activeView === 'dashboard' && (
          <div>
            {newsError && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: theme.errorBg, border: `1px solid ${theme.border}`, borderRadius: '8px', fontSize: '13px', color: theme.errorText }}>
                {newsError}
              </div>
            )}

            <section style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', color: theme.textMuted, marginBottom: '12px', textTransform: 'uppercase' }}>Search News</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Search for specific topics, companies, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
                <button
                  onClick={loadNews}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: theme.primary || '#6B46C1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  {loading ? 'Loading...' : 'Search'}
                </button>
              </div>
            </section>

            <section style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', color: theme.textMuted, marginBottom: '12px', textTransform: 'uppercase' }}>Category</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(allSectorsList || []).slice(0, 8).map((sector) => {
                  const isSelected = (selectedSectors || []).includes(sector.id);
                  return (
                    <button
                      key={sector.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) setSelectedSectors((prev) => (prev || []).filter((s) => s !== sector.id));
                        else setSelectedSectors((prev) => [...(prev || []), sector.id]);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '9999px',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: `1px solid ${isSelected ? (theme.primary || '#6B46C1') : theme.border}`,
                        backgroundColor: isSelected ? (theme.primary || '#6B46C1') : theme.surface,
                        color: isSelected ? '#ffffff' : theme.textMuted,
                        cursor: 'pointer',
                      }}
                    >
                      {sector.name}
                    </button>
                  );
                })}
              </div>
            </section>

            {loading && (news || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: theme.textMutedLight }}>Loading news...</div>
            ) : (filteredNews || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: theme.textMutedLight }}>No news found. Try adjusting filters or search.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(filteredNews || []).map((article, idx) => (
                  <article
                    key={(article.url || '') + idx}
                    style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '16px',
                      backgroundColor: theme.surface,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '12px',
                      boxShadow: themeMode === 'dark' ? '0 1px 3px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, width: '96px', height: '96px', borderRadius: '8px', overflow: 'hidden', backgroundColor: theme.secondaryBgAlt }}>
                      {article.urlToImage ? (
                        <img src={article.urlToImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: theme.textMutedLight }}>No image</div>
                      )}
                    </a>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: theme.text, marginBottom: '6px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.title}</h3>
                      </a>
                      {article.description && (
                        <p style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '8px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.description}</p>
                      )}
                      <p style={{ fontSize: '12px', color: theme.textMutedLight }}>
                        {(article.source && article.source.name) || 'Unknown'} - {timeAgo(article.publishedAt)}
                      </p>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '500',
                          backgroundColor: themeMode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : '#fef9c3',
                          color: themeMode === 'dark' ? '#fcd34d' : '#92400e',
                          border: `1px solid ${themeMode === 'dark' ? 'rgba(245, 158, 11, 0.4)' : '#fde047'}`,
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ color: themeMode === 'dark' ? '#fbbf24' : '#b45309' }}>*</span>
                        AI Summary
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'alerts' && (
          <div style={{ marginBottom: '32px' }}>
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.input}
            />
          </div>
        )}

        {activeView === 'watchlist' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Watchlist</h2>
            <div
              style={{
                padding: '20px',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                marginBottom: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Search Stocks</div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Search by symbol or company name"
                  value={watchlistSearchQuery}
                  onChange={(e) => setWatchlistSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !watchlistSearching && watchlistSearchQuery.trim() && searchWatchlistStocks()}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#f0f0f0'}
                />
                <button
                  onClick={searchWatchlistStocks}
                  disabled={watchlistSearching || !watchlistSearchQuery.trim()}
                  style={{
                    padding: '14px 32px',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: (watchlistSearching || !watchlistSearchQuery.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: (watchlistSearching || !watchlistSearchQuery.trim()) ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.15)',
                  }}
                >
                  {watchlistSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              {watchlistSearchError && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', color: theme.errorText, fontSize: '13px' }}>
                  {watchlistSearchError}
                </div>
              )}
              {!watchlistSearchError && watchlistSearchResults && watchlistSearchResults.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '8px' }}>Search results - click Add to add to watchlist</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {watchlistSearchResults.map((result) => {
                      const symbol = (result && result.symbol) || (typeof result === 'string' ? result : '');
                      if (!symbol) return null;
                      return (
                        <div
                          key={symbol}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            backgroundColor: theme.secondaryBgAlt,
                            borderRadius: '8px',
                            border: `1px solid ${theme.border}`,
                          }}
                        >
                          <span style={{ fontWeight: '600', fontSize: '14px' }}>{symbol}</span>
                          {result.name && <span style={{ fontSize: '12px', color: theme.textMuted }}>{result.name}</span>}
                          <button
                            onClick={() => addFromWatchlistSearchResult(result)}
                            disabled={(watchlist || []).includes(symbol.toUpperCase())}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: (watchlist || []).includes(symbol.toUpperCase()) ? theme.textMuted : '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: (watchlist || []).includes(symbol.toUpperCase()) ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                              fontWeight: '500',
                              opacity: (watchlist || []).includes(symbol.toUpperCase()) ? 0.7 : 1,
                            }}
                          >
                            {(watchlist || []).includes(symbol.toUpperCase()) ? 'In watchlist' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {!watchlistSearchError && hasSearched && !watchlistSearching && watchlistSearchResults.length === 0 && (
                <div style={{ marginTop: '12px', fontSize: '13px', color: theme.textMuted }}>No matches found. Try a symbol (e.g. AAPL) or company name.</div>
              )}
            </div>
            <div
              style={{
                padding: '20px',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                marginBottom: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Add Ticker (manual)</div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Enter ticker symbol (e.g., AAPL, TSLA)"
                  value={newTickerInput}
                  onChange={(e) => setNewTickerInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && addTickerToWatchlist()}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: theme.surface,
                    color: theme.text,
                  }}
                />
                <button
                  onClick={addTickerToWatchlist}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            {(watchlist || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.textMutedLight }}>No tickers in watchlist. Add some above!</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {(watchlist || []).map((ticker) => {
                  const wq = (watchlistQuotes || {})[ticker];
                  return (
                    <div
                      key={ticker}
                      style={{
                        padding: '20px',
                        backgroundColor: theme.surface,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '20px', fontWeight: '600' }}>{ticker}</div>
                          {(stockInfo || {})[ticker]?.name && (
                            <div style={{ fontSize: '13px', color: theme.textMuted, marginTop: '2px' }}>{(stockInfo || {})[ticker].name}</div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setWatchlist((watchlist || []).filter((t) => t !== ticker));
                            setStockInfo((prev) => {
                              const next = { ...(prev || {}) };
                              delete next[ticker];
                              return next;
                            });
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      {wq && (
                        <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontSize: '18px', fontWeight: '600' }}>
                            ${Number(wq.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span style={{ color: (wq.change || 0) >= 0 ? '#10b981' : '#ef4444', fontSize: '14px' }}>
                            {(wq.change || 0) >= 0 ? '+' : ''}{Number(wq.change || 0).toFixed(2)} ({wq.changePercent || '0%'})
                          </span>
                          {loadingWatchlistQuotes[ticker] && <span style={{ fontSize: '12px', color: theme.textMuted }}>Updating...</span>}
                        </div>
                      )}
                      {!wq && !loadingWatchlistQuotes[ticker] && (
                        <div style={{ marginBottom: '12px', fontSize: '13px', color: theme.textMuted }}>No quote yet</div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => refreshWatchlistQuote(ticker)}
                          disabled={loadingWatchlistQuotes[ticker]}
                          style={{
                            padding: '8px 12px',
                            fontSize: '13px',
                            border: `1px solid ${theme.border}`,
                            borderRadius: '6px',
                            backgroundColor: theme.surface,
                            color: theme.text,
                            cursor: loadingWatchlistQuotes[ticker] ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {loadingWatchlistQuotes[ticker] ? 'Updating...' : 'Refresh price'}
                        </button>
                        <button
                          onClick={() => briefTicker(ticker)}
                          disabled={loading}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#6366f1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                          }}
                        >
                          {loading && selectedTicker === ticker ? 'Loading...' : 'Brief Me'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeView === 'alerts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Alerts</h2>
              <div style={{ fontSize: '12px', color: theme.textMuted }}>
                Last checked: {lastAlertCheck ? new Date(lastAlertCheck).toLocaleString() : 'Never'}
              </div>
            </div>
            <button
              onClick={checkAlerts}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '24px',
              }}
            >
              {loading ? 'Checking...' : 'Check Alerts'}
            </button>

            <div
              style={{
                padding: '20px',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                marginBottom: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Price Alerts</div>
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>
                    Rules: {(priceAlertRules || []).length} | Enabled: {(priceAlertRules || []).filter((r) => r && r.enabled).length} | Last check:{' '}
                    {priceAlertLastCheck ? new Date(priceAlertLastCheck).toLocaleString() : 'Never'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => runPriceAlertCheck('manual')}
                  disabled={priceAlertChecking}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: priceAlertChecking ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                  }}
                >
                  {priceAlertChecking ? 'Checking...' : 'Check Prices Now'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <input
                  type="text"
                  value={newPriceAlertTicker}
                  onChange={(e) => setNewPriceAlertTicker((e.target.value || '').toUpperCase())}
                  placeholder="Tickers (e.g. AAPL, TSLA, NVDA)"
                  style={{
                    flex: '1 1 160px',
                    padding: '10px 12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: theme.surface,
                    color: theme.text,
                  }}
                />
                <select
                  value={newPriceAlertType}
                  onChange={(e) => setNewPriceAlertType(e.target.value)}
                  style={{
                    flex: '1 1 200px',
                    padding: '10px 12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: theme.surface,
                    color: theme.text,
                  }}
                >
                  <option value="above">Above ($)</option>
                  <option value="below">Below ($)</option>
                  <option value="pct_up">Up (%) vs baseline</option>
                  <option value="pct_down">Down (%) vs baseline</option>
                </select>
                <input
                  type="text"
                  value={newPriceAlertThreshold}
                  onChange={(e) => setNewPriceAlertThreshold(e.target.value)}
                  placeholder={String(newPriceAlertType || '').startsWith('pct') ? 'Percent (e.g. 5)' : 'Price (e.g. 200)'}
                  style={{
                    flex: '1 1 160px',
                    padding: '10px 12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: theme.surface,
                    color: theme.text,
                  }}
                />
                <button
                  type="button"
                  onClick={addPriceAlertRule}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: theme.secondaryBg,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  Add Rule
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: theme.text }}>Search tickers</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={priceAlertTickerQuery}
                    onChange={(e) => setPriceAlertTickerQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchPriceAlertTickers()}
                    placeholder="Search by name or symbol (e.g. Tesla, AAPL, SPY)"
                    style={{
                      flex: '1 1 260px',
                      padding: '10px 12px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: theme.surface,
                      color: theme.text,
                    }}
                  />
                  <button
                    type="button"
                    onClick={searchPriceAlertTickers}
                    disabled={priceAlertTickerSearching}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#6366f1',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: priceAlertTickerSearching ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    {priceAlertTickerSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {(priceAlertTickerResults || []).length > 0 && (
                  <div style={{ marginTop: '10px', display: 'grid', gap: '10px' }}>
                    {(priceAlertTickerResults || []).map((r, idx) => (
                      <div
                        key={(r && (r.symbol || r.id)) || idx}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          border: `1px solid ${theme.border}`,
                          backgroundColor: theme.secondaryBgAlt,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: theme.text }}>
                            {(r && r.symbol) ? String(r.symbol).toUpperCase() : '-'}
                            {r && r.name ? <span style={{ marginLeft: 8, fontSize: '12px', fontWeight: '500', color: theme.textMuted }}>{r.name}</span> : null}
                          </div>
                          {(r && (r.type || r.region)) ? (
                            <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: 2 }}>
                              {[r.type, r.region].filter(Boolean).join(' | ')}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => _appendTickerToPriceAlertInput(r && r.symbol)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#6366f1',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '700',
                          }}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme.text }}>
                  <input
                    type="checkbox"
                    checked={!!priceAlertPollingEnabled}
                    onChange={(e) => setPriceAlertPollingEnabled(e.target.checked)}
                  />
                  Background polling
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme.textMuted }}>
                  Every
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={priceAlertPollingMinutes}
                    onChange={(e) => setPriceAlertPollingMinutes(Number(e.target.value))}
                    style={{
                      width: '80px',
                      padding: '6px 8px',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      fontSize: '13px',
                      backgroundColor: theme.surface,
                      color: theme.text,
                    }}
                  />
                  minutes
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme.text }}>
                  <input
                    type="checkbox"
                    checked={!!priceAlertEmailEnabled}
                    onChange={(e) => setPriceAlertEmailEnabled(e.target.checked)}
                  />
                  Email me when triggered
                </label>
                <input
                  type="email"
                  value={priceAlertEmail}
                  onChange={(e) => setPriceAlertEmail(e.target.value)}
                  placeholder="you@email.com"
                  style={{
                    flex: '1 1 220px',
                    padding: '10px 12px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: theme.surface,
                    color: theme.text,
                  }}
                />
              </div>

              {priceAlertError && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: theme.errorBg, borderRadius: '8px', color: theme.errorText, fontSize: '13px' }}>
                  <strong>Price alerts:</strong> {priceAlertError}
                </div>
              )}

              {(priceAlertRules || []).length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  {(priceAlertRules || []).map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        padding: '12px',
                        border: `1px solid ${theme.border}`,
                        borderRadius: '10px',
                        marginBottom: '10px',
                        backgroundColor: theme.secondaryBgAlt,
                      }}
                    >
                      <div style={{ minWidth: 220 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>{_formatPriceRuleLabel(rule)}</div>
                        <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>
                          {typeof rule.lastPrice === 'number' ? `Last price: $${Number(rule.lastPrice).toFixed(2)}` : ''}
                          {typeof rule.lastPrice === 'number' ? (rule.lastState ? ' | Status: triggered' : ' | Status: monitoring') : ''}
                          {String(rule.type || '').startsWith('pct') && typeof rule.referencePrice === 'number' ? `Baseline: $${Number(rule.referencePrice).toFixed(2)}` : ''}
                          {String(rule.type || '').startsWith('pct') && typeof rule.lastChangePercentFromRef === 'number' ? ` | Move: ${Number(rule.lastChangePercentFromRef).toFixed(2)}%` : ''}
                          {rule.lastTriggeredAt ? ` | Last triggered: ${new Date(rule.lastTriggeredAt).toLocaleString()}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {String(rule.type || '').startsWith('pct') && (
                          <button
                            type="button"
                            onClick={async () => {
                              const q = await _fetchQuote(rule.ticker);
                              if (!q.ok) {
                                setPriceAlertError(`Could not reset baseline: ${q.error}`);
                                return;
                              }
                              const ref = Number(q.quote.price || 0);
                              setPriceAlertRules((prev) =>
                                (prev || []).map((r) => (r.id === rule.id ? { ...r, referencePrice: ref, lastState: false } : r))
                              );
                            }}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: theme.secondaryBg,
                              color: theme.text,
                              border: `1px solid ${theme.border}`,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}
                          >
                            Reset baseline
                          </button>
                        )}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme.text }}>
                          <input
                            type="checkbox"
                            checked={!!rule.enabled}
                            onChange={(e) =>
                              setPriceAlertRules((prev) =>
                                (prev || []).map((r) => (r.id === rule.id ? { ...r, enabled: e.target.checked, lastState: false } : r))
                              )
                            }
                          />
                          Enabled
                        </label>
                        <button
                          type="button"
                          onClick={() => setPriceAlertRules((prev) => (prev || []).filter((r) => r.id !== rule.id))}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(priceAlertEvents || []).length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>Triggered</div>
                    <button
                      type="button"
                      onClick={() => setPriceAlertEvents([])}
                      style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                    >
                      Clear
                    </button>
                  </div>
                  {(priceAlertEvents || []).slice(0, 10).map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: `1px solid ${theme.border}`,
                        backgroundColor: theme.surface,
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: '600', color: theme.text }}>{evt.ruleLabel}</div>
                      <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>
                        ${Number(evt.price || 0).toFixed(2)} | {new Date(evt.triggeredAt).toLocaleString()}
                        {typeof evt.changePercentFromRef === 'number' ? ` | ${Number(evt.changePercentFromRef).toFixed(2)}% vs baseline` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(watchlist || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.textMutedLight }}>
                <p style={{ marginBottom: '16px' }}>Add tickers to your watchlist to see news alerts.</p>
                <button
                  onClick={() => setActiveView('watchlist')}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Go to Watchlist
                </button>
              </div>
            ) : (alerts || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.textMutedLight }}>
                No alerts. Your watchlist stocks haven't been mentioned recently.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {(alerts || []).map((article, idx) => (
                  <a
                    key={idx}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '20px',
                      backgroundColor: theme.surface,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                      textDecoration: 'none',
                      color: theme.text,
                      display: 'block',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', lineHeight: '1.4' }}>{article.title}</div>
                    <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '12px' }}>
                      {(article.source && article.source.name) || 'Unknown'} | {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}
                    </div>
                    {article.catalysts && article.catalysts.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {article.catalysts.map((catId) => {
                          const cat = (CATALYSTS || []).find((c) => c.id === catId);
                          return cat ? (
                            <span
                              key={catId}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: (cat.color || '') + '20',
                                color: cat.color,
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500',
                              }}
                            >
                              {cat.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'ticker' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Ticker Detail</h2>
            {!tickerBrief ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.textMutedLight }}>
                <p style={{ marginBottom: '16px' }}>Select a ticker from Watchlist and click "Brief Me" to see details.</p>
                {(watchlist || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
                    {(watchlist || []).map((t) => (
                      <button
                        key={t}
                        onClick={() => briefTicker(t)}
                        disabled={loading}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#6366f1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                        }}
                      >
                        {loading && selectedTicker === t ? 'Loading...' : t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div
                  style={{
                    padding: '24px',
                    backgroundColor: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '12px',
                    marginBottom: '24px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>{tickerBrief.ticker} - Executive Brief</h3>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: '24px' }}>{tickerBrief.summary}</div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Forecast Scenarios</h4>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{tickerBrief.forecast}</div>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Recent News</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {(tickerBrief.news || []).map((article, idx) => (
                      <a
                        key={idx}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '16px',
                          backgroundColor: theme.secondaryBgAlt,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '8px',
                          textDecoration: 'none',
                          color: theme.text,
                          display: 'block',
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>{article.title}</div>
                        <div style={{ fontSize: '12px', color: theme.textMuted }}>
                          {(article.source && article.source.name) || 'Unknown'} | {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'digest' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Daily Digest</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={digest ? () => setDigest(null) : generateDigest}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  {loading ? 'Generating...' : digest ? 'Close digest' : 'Generate Digest'}
                </button>
                {digest && (
                  <>
                    <button
                      onClick={openEmailModal}
                      disabled={emailLoading}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: emailLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      {emailLoading ? 'Sending...' : 'Email'}
                    </button>
                    <button
                      onClick={exportToPDF}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#f59e0b',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      Export PDF
                    </button>
                  </>
                )}
              </div>
            </div>

            {!digest ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.textMutedLight }}>
                Click "Generate Digest" to create a daily market summary.
              </div>
            ) : (
              <div
                id="digest-content"
                style={{
                  padding: '32px',
                  backgroundColor: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${theme.border}` }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Daily Market Digest</h3>
                  <div style={{ fontSize: '14px', color: theme.textMuted }}>{digest.date}</div>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '15px', marginBottom: '32px' }}>{digest.content}</div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Key Articles</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                    {(digest.articles || []).map((article, idx) => (
                      <a
                        key={idx}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '12px',
                          backgroundColor: theme.secondaryBgAlt,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '6px',
                          textDecoration: 'none',
                          color: theme.text,
                          fontSize: '13px',
                        }}
                      >
                        {article.title}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'social' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Social Tracking</h2>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <button
                onClick={() => setSocialSearchPlatform('youtube')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: socialSearchPlatform === 'youtube' ? (theme.primary || '#6B46C1') : 'transparent',
                  color: socialSearchPlatform === 'youtube' ? '#ffffff' : theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                YouTube
              </button>
              <button
                onClick={() => setSocialSearchPlatform('linkedin')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: socialSearchPlatform === 'linkedin' ? (theme.primary || '#6B46C1') : 'transparent',
                  color: socialSearchPlatform === 'linkedin' ? '#ffffff' : theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                LinkedIn
              </button>
            </div>

            {socialSearchPlatform === 'linkedin' && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: themeMode === 'dark' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.1)', border: `1px solid ${themeMode === 'dark' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.35)'}`, borderRadius: '8px', fontSize: '13px', color: themeMode === 'dark' ? '#fcd34d' : '#92400e' }}>
                LinkedIn doesn&apos;t offer a public search API. We open LinkedIn&apos;s own search in a new tab. Results and ranking are from LinkedIn; we don&apos;t control quality (e.g. fake or irrelevant profiles may appear).
              </div>
            )}

            <div
              style={{
                padding: '20px',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                marginBottom: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder={fixMojibake(socialSearchPlatform === 'linkedin' ? "Name or topic - we'll open LinkedIn search" : 'Search YouTube channels/videos...')}
                  value={socialSearchQuery}
                  onChange={(e) => setSocialSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchSocial()}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: theme.surface,
                    color: theme.text,
                  }}
                />
                <button
                  onClick={searchSocial}
                  disabled={socialLoading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: socialLoading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  {socialLoading ? 'Searching...' : socialSearchPlatform === 'linkedin' ? 'Open LinkedIn search' : 'Search'}
                </button>
              </div>
            </div>

            {followedAccounts && followedAccounts.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Following ({followedAccounts.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                  {followedAccounts.map((account, idx) => {
                    const isLinkedIn = account.platform === 'linkedin';
                    const linkUrl = isLinkedIn
                      ? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(account.name || account.headline || '')}`
                      : account.videoId
                        ? `https://www.youtube.com/watch?v=${account.videoId}`
                        : (account.channelId || (account.snippet && account.snippet.channelId))
                          ? `https://www.youtube.com/channel/${account.channelId || account.snippet.channelId}`
                          : `https://www.youtube.com/results?search_query=${encodeURIComponent((account.snippet && account.snippet.title) || account.title || '')}`;
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '16px',
                          backgroundColor: theme.surface,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <a
                              href={linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '16px',
                                fontWeight: '600',
                                color: '#6366f1',
                                textDecoration: 'none',
                                display: 'block',
                                marginBottom: '4px',
                              }}
                            >
                              {account.name || (account.snippet && account.snippet.title) || account.title || 'Unknown'}
                            </a>
                            <div style={{ fontSize: '12px', color: theme.textMuted }}>
                              {isLinkedIn ? account.headline : (account.snippet && account.snippet.channelTitle)}
                            </div>
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: '8px',
                                padding: '4px 8px',
                                backgroundColor: isLinkedIn ? '#0077b5' : '#ff0000',
                                color: '#ffffff',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '500',
                              }}
                            >
                              {isLinkedIn ? 'LinkedIn' : 'YouTube'}
                            </span>
                          </div>
                          <button
                            onClick={() => unfollowAccount(account.id || account.channelId || (account.snippet && account.snippet.channelId), account.platform)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#ef4444',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            Unfollow
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {socialResults && socialResults.length > 0 && socialSearchPlatform === 'linkedin' && socialResults.every((r) => r.platform === 'linkedin') && (() => {
              const linkedinLinks = socialResults.filter((r) => r.searchUrl || r.link);
              if (linkedinLinks.length > 0) {
                const selected = linkedinLinks.find((r) => (r.name || '').toLowerCase().startsWith(linkedinTab)) || linkedinLinks[0];
                const url = selected.searchUrl || selected.link;
                return (
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>LinkedIn</h3>
                    <p style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '16px' }}>
                      We can&apos;t search LinkedIn from here. Choose what to search, then open LinkedIn for &quot;{socialSearchQuery}&quot; in a new tab. Add people you find to Following manually if you like.
                    </p>
                    <div style={{ maxWidth: '520px', padding: '20px', backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)' }}>
                      <div style={{ display: 'flex', gap: '4px', padding: '4px', backgroundColor: theme.secondaryBg, borderRadius: '8px', marginBottom: '16px' }}>
                        {['people', 'jobs', 'companies'].map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setLinkedinTab(tab)}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '500',
                              textTransform: 'capitalize',
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: linkedinTab === tab ? theme.surface : 'transparent',
                              color: linkedinTab === tab ? theme.text : theme.textMuted,
                              boxShadow: linkedinTab === tab ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                            }}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                      <p style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '16px' }}>
                        {(selected.headline || `Search ${linkedinTab} on LinkedIn`)} for &quot;{socialSearchQuery}&quot;
                      </p>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 18px',
                          borderRadius: '8px',
                          backgroundColor: '#0A66C2',
                          color: '#fff',
                          fontWeight: '600',
                          textDecoration: 'none',
                          fontSize: '14px',
                        }}
                      >
                        Open on LinkedIn â†’
                      </a>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {socialResults && socialResults.length > 0 && socialSearchPlatform === 'youtube' && socialResults.some((r) => r.platform === 'youtube') && (() => {
              return (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Search Results</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                  {socialResults.map((result, idx) => {
                    const isLinkedIn = result.platform === 'linkedin';
                    const isFollowing = (followedAccounts || []).some((acc) => acc.id === result.id && acc.platform === result.platform);
                    const linkUrl = isLinkedIn
                      ? (result.searchUrl || result.link) || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(result.name || result.headline || socialSearchQuery)}`
                      : result.videoId
                        ? `https://www.youtube.com/watch?v=${result.videoId}`
                        : (result.channelId || (result.snippet && result.snippet.channelId))
                          ? `https://www.youtube.com/channel/${result.channelId || result.snippet.channelId}`
                          : `https://www.youtube.com/results?search_query=${encodeURIComponent((result.snippet && result.snippet.title) || result.title || socialSearchQuery)}`;
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '16px',
                          backgroundColor: theme.surface,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        <div style={{ marginBottom: '12px' }}>
                          <a
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#6366f1',
                              textDecoration: 'none',
                              display: 'block',
                              marginBottom: '4px',
                            }}
                          >
                            {result.name || (result.snippet && result.snippet.title) || result.title || 'Unknown'}
                          </a>
                          <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '8px' }}>
                            {isLinkedIn ? result.headline : (result.snippet && result.snippet.channelTitle) || (result.snippet && result.snippet.description)}
                          </div>
                          {isLinkedIn && result.location && (
                            <div style={{ fontSize: '11px', color: theme.textMutedLight }}>{result.location}</div>
                          )}
                          {!isLinkedIn && result.snippet && result.snippet.publishedAt && (
                            <div style={{ fontSize: '11px', color: theme.textMutedLight }}>
                              {new Date(result.snippet.publishedAt).toLocaleDateString()}
                            </div>
                          )}
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: '8px',
                              padding: '4px 8px',
                              backgroundColor: isLinkedIn ? '#0077b5' : '#ff0000',
                              color: '#ffffff',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: '500',
                            }}
                          >
                            {isLinkedIn ? 'LinkedIn' : 'YouTube'}
                          </span>
                        </div>
                        <button
                          onClick={() => (isFollowing ? unfollowAccount(result.id || result.channelId || (result.snippet && result.snippet.channelId), result.platform) : followAccount(result))}
                          style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: isFollowing ? '#ef4444' : (theme.primary || '#6B46C1'),
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                          }}
                        >
                          {isFollowing ? 'Following' : '+ Follow'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })()}

            {!socialLoading && socialSearchQuery && (() => {
              const hasLinkedInResults = socialResults.length > 0 && socialResults.every((r) => r.platform === 'linkedin');
              const hasYoutubeResults = socialResults.length > 0 && socialResults.some((r) => r.platform === 'youtube');
              const showNoResults = (socialSearchPlatform === 'linkedin' && !hasLinkedInResults) || (socialSearchPlatform === 'youtube' && !hasYoutubeResults);
              return showNoResults ? (
                <div style={{ textAlign: 'center', padding: '40px', color: theme.textMutedLight }}>No results for this tab. Search above or switch tab.</div>
              ) : null;
            })()}
          </div>
        )}

        {activeView === 'portfolio' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>Portfolio</h2>
            <div
              style={{
                padding: '20px',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                marginBottom: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Search Stocks</div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Search by symbol or company name"
                  value={portfolioSearchQuery}
                  onChange={(e) => setPortfolioSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !portfolioSearching && portfolioSearchQuery.trim() && searchPortfolioTicker()}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#f0f0f0'}
                />
                <button
                  onClick={searchPortfolioTicker}
                  disabled={portfolioSearching || !portfolioSearchQuery.trim()}
                  style={{
                    padding: '14px 32px',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: (portfolioSearching || !portfolioSearchQuery.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: (portfolioSearching || !portfolioSearchQuery.trim()) ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.15)',
                  }}
                >
                  {portfolioSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              {portfolioSearchError && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', color: theme.errorText, fontSize: '13px' }}>
                  {portfolioSearchError}
                </div>
              )}
              {!portfolioSearchError && portfolioSearchResults && portfolioSearchResults.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '8px' }}>Search results - click Add to add to portfolio</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {portfolioSearchResults.map((result) => {
                      const symbol = (result && result.symbol) || (typeof result === 'string' ? result : '');
                      if (!symbol) return null;
                      return (
                        <div
                          key={symbol}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            backgroundColor: theme.secondaryBgAlt,
                            borderRadius: '8px',
                            border: `1px solid ${theme.border}`,
                          }}
                        >
                          <span style={{ fontWeight: '600', fontSize: '14px' }}>{symbol}</span>
                          {result.name && <span style={{ fontSize: '12px', color: theme.textMuted }}>{result.name}</span>}
                          <button
                            onClick={() => addFromPortfolioSearchResult(result)}
                            disabled={(watchlist || []).includes(symbol.toUpperCase())}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: (watchlist || []).includes(symbol.toUpperCase()) ? theme.textMuted : '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: (watchlist || []).includes(symbol.toUpperCase()) ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                              fontWeight: '500',
                              opacity: (watchlist || []).includes(symbol.toUpperCase()) ? 0.7 : 1,
                            }}
                          >
                            {(watchlist || []).includes(symbol.toUpperCase()) ? 'In portfolio' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {!portfolioSearchError && portfolioHasSearched && !portfolioSearching && portfolioSearchResults.length === 0 && (
                <div style={{ marginTop: '12px', fontSize: '13px', color: theme.textMuted }}>No matches found. Try a symbol (e.g. AAPL) or company name.</div>
              )}
            </div>
            <div
              style={{
                padding: '20px',
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: '12px',
                marginBottom: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Track Stock (manual)</div>
              <div style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '16px' }}>
                Or enter a ticker symbol directly to track.
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Enter ticker symbol (e.g., AAPL, TSLA)"
                  value={newTickerInput}
                  onChange={(e) => setNewTickerInput(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && addTickerToWatchlist()}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: theme.surface,
                    color: theme.text,
                  }}
                />
                <button
                  onClick={addTickerToWatchlist}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Track Stock
                </button>
              </div>
            </div>

            {Object.keys(positions || {}).length === 0 && (watchlist || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.textMutedLight }}>No positions tracked. Add stocks above to get started!</div>
            ) : (
              <div>
                {Object.keys(positions || {}).length > 0 && (
                  <div
                    style={{
                      padding: '20px',
                      backgroundColor: theme.surface,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '12px',
                      marginBottom: '24px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Portfolio Summary</h3>
                      <button
                        type="button"
                        onClick={refreshAllPortfolioPrices}
                        disabled={refreshingAllPortfolioPrices || !Object.keys(positions || {}).some((t) => (positions || {})[t]?.quantity)}
                        style={{
                          padding: '8px 14px',
                          fontSize: '13px',
                          fontWeight: '500',
                          backgroundColor: '#059669',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: refreshingAllPortfolioPrices ? 'not-allowed' : 'pointer',
                          opacity: refreshingAllPortfolioPrices ? 0.7 : 1,
                        }}
                      >
                        {refreshingAllPortfolioPrices ? 'Updating...' : 'Refresh all prices'}
                      </button>
                    </div>
                    {(() => {
                      const pos = positions || {};
                      const totalCost = Object.values(pos).reduce((sum, p) => sum + (p.costBasis || (p.quantity || 0) * (p.entryPrice || 0)), 0);
                      const totalValue = Object.values(pos).reduce((sum, p) => sum + (p.currentValue || (p.quantity || 0) * (p.currentPrice || p.entryPrice || 0)), 0);
                      const totalPL = totalValue - totalCost;
                      const totalPLPercent = totalCost > 0 ? ((totalPL / totalCost) * 100).toFixed(2) : 0;
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '4px' }}>Total Cost</div>
                            <div style={{ fontSize: '20px', fontWeight: '600' }}>${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '4px' }}>Current Value</div>
                            <div style={{ fontSize: '20px', fontWeight: '600' }}>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '4px' }}>P&L</div>
                            <div style={{ fontSize: '20px', fontWeight: '600', color: totalPL >= 0 ? '#10b981' : '#ef4444' }}>
                              ${totalPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({totalPLPercent}%)
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {[...new Set([...(watchlist || []), ...Object.keys(positions || {})])].map((ticker) => {
                    const position = (positions || {})[ticker] || {};
                    const notes = (tickerNotes || {})[ticker] || '';
                    const costBasis = (position.quantity || 0) * (position.entryPrice || 0);
                    const currentValue = (position.quantity || 0) * (position.currentPrice || position.entryPrice || 0);
                    const pl = currentValue - costBasis;
                    const plPercent = costBasis > 0 ? ((pl / costBasis) * 100).toFixed(2) : 0;

                    return (
                      <div
                        key={ticker}
                        style={{
                          padding: '20px',
                          backgroundColor: theme.surface,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '12px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <div>
                            <div style={{ fontSize: '20px', fontWeight: '600' }}>{ticker}</div>
                            {(stockInfo || {})[ticker]?.name && (
                              <div style={{ fontSize: '13px', color: theme.textMuted, marginTop: '2px' }}>{(stockInfo || {})[ticker].name}</div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (typeof window !== 'undefined' && window.confirm && window.confirm(`Remove ${ticker} from tracking?`)) {
                                const currentWatchlist = watchlist || [];
                                setWatchlist(currentWatchlist.filter((t) => t !== ticker));
                                deletePosition(ticker);
                                setStockInfo((prev) => {
                                  const next = { ...(prev || {}) };
                                  delete next[ticker];
                                  return next;
                                });
                              }
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#ef4444',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            Remove
                          </button>
                        </div>

                        {editingPosition === ticker ? (
                          <div>
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Quantity</label>
                              <input
                                type="number"
                                value={position.quantity || ''}
                                onChange={(e) => updatePosition(ticker, { ...position, quantity: parseFloat(e.target.value) || 0 })}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  backgroundColor: theme.surface,
                                  color: theme.text,
                                }}
                              />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Entry Price</label>
                              <input
                                type="number"
                                step="0.01"
                                value={position.entryPrice || ''}
                                onChange={(e) => updatePosition(ticker, { ...position, entryPrice: parseFloat(e.target.value) || 0 })}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  backgroundColor: theme.surface,
                                  color: theme.text,
                                }}
                              />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Current price</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '13px', color: theme.textMuted }}>
                                  {refreshingQuotes[ticker] ? 'Loading...' : (position.currentPrice != null && position.currentPrice !== '') ? `$${Number(position.currentPrice).toFixed(2)} (live)` : '-'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => refreshQuote(ticker, true)}
                                  disabled={refreshingQuotes[ticker]}
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '12px',
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: '6px',
                                    backgroundColor: theme.surface,
                                    color: theme.text,
                                    cursor: refreshingQuotes[ticker] ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  Refresh
                                </button>
                              </div>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Target Price</label>
                              <input
                                type="number"
                                step="0.01"
                                value={position.targetPrice || ''}
                                onChange={(e) => updatePosition(ticker, { ...position, targetPrice: parseFloat(e.target.value) || 0 })}
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  backgroundColor: theme.surface,
                                  color: theme.text,
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => {
                                  updatePosition(ticker, {
                                    ...position,
                                    costBasis: (position.quantity || 0) * (position.entryPrice || 0),
                                    currentValue: (position.quantity || 0) * (position.currentPrice || position.entryPrice || 0),
                                  });
                                  setEditingPosition(null);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '8px',
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '500',
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingPosition(null)}
                                style={{
                                  flex: 1,
                                  padding: '8px',
                                  backgroundColor: theme.secondaryBgAlt,
                                  color: theme.text,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {position.quantity ? (
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '8px' }}>
                                  <div>
                                    <div style={{ color: theme.textMuted }}>Quantity</div>
                                    <div style={{ fontWeight: '600' }}>{position.quantity}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: theme.textMuted }}>Entry</div>
                                    <div style={{ fontWeight: '600' }}>${(position.entryPrice != null && position.entryPrice !== '') ? Number(position.entryPrice).toFixed(2) : '0.00'}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: theme.textMuted }}>Current</div>
                                    <div style={{ fontWeight: '600' }}>${(position.currentPrice != null && position.currentPrice !== '') ? Number(position.currentPrice).toFixed(2) : (position.entryPrice != null ? Number(position.entryPrice).toFixed(2) : '0.00')}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: theme.textMuted }}>Target</div>
                                    <div style={{ fontWeight: '600' }}>${(position.targetPrice != null && position.targetPrice !== '') ? Number(position.targetPrice).toFixed(2) : 'N/A'}</div>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    padding: '12px',
                                    backgroundColor: theme.secondaryBgAlt,
                                    borderRadius: '8px',
                                    marginTop: '12px',
                                  }}
                                >
                                  <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '4px' }}>P&L</div>
                                  <div style={{ fontSize: '18px', fontWeight: '600', color: pl >= 0 ? '#10b981' : '#ef4444' }}>
                                    ${Number(pl).toFixed(2)} ({plPercent}%)
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ marginBottom: '16px', fontSize: '13px', color: theme.textMuted }}>No position data. Click "Edit Position" to add.</div>
                            )}

                            <button
                              onClick={() => setEditingPosition(ticker)}
                              style={{
                                width: '100%',
                                padding: '10px',
                                backgroundColor: '#6366f1',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                marginBottom: '12px',
                              }}
                            >
                              {position.quantity ? 'Edit Position' : 'Add Position'}
                            </button>

                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Notes</div>
                              <textarea
                                value={notes}
                                onChange={(e) => setTickerNotes({ ...(tickerNotes || {}), [ticker]: e.target.value })}
                                placeholder="Add notes about this stock..."
                                style={{
                                  width: '100%',
                                  minHeight: '80px',
                                  padding: '8px',
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  backgroundColor: theme.surface,
                                  color: theme.text,
                                  resize: 'vertical',
                                  fontFamily: 'inherit',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sectors page removed in widget build (matches localhost UI) */}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #digest-content, #digest-content * { visibility: visible; }
          #digest-content { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {showEmailModal && digest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => !emailLoading && setShowEmailModal(false)}
        >
          <div
            style={{
              padding: '24px',
              minWidth: '320px',
              maxWidth: '90vw',
              backgroundColor: theme.surface,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Send digest to your email</h3>
            <p style={{ fontSize: '14px', color: theme.textMuted, marginBottom: '16px' }}>
              Enter your email and we'll send you today's digest (including key articles).
            </p>
            <input
              type="email"
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                marginBottom: '12px',
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                fontSize: '15px',
                backgroundColor: theme.surface,
                color: theme.text,
                outline: 'none',
              }}
            />
            {emailError && (
              <p style={{ fontSize: '13px', color: theme.errorText, marginBottom: '12px' }}>{emailError}</p>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => !emailLoading && setShowEmailModal(false)}
                style={{
                  padding: '10px 18px',
                  backgroundColor: theme.secondaryBgAlt,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  cursor: emailLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendDigestEmail}
                disabled={emailLoading}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: emailLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {emailLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

export default FinancialCommandCenter;
if (typeof window !== 'undefined') {
  window.FinancialCommandCenter = FinancialCommandCenter;
}

