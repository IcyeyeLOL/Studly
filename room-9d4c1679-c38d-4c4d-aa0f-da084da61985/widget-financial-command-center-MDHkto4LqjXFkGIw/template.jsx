import React, { useState, useEffect, useMemo } from 'react';

// Constants
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

function FinancialCommandCenter() {
  // Storage hooks - using user scope for personal data
  const [watchlist, setWatchlist] = useStorage('financial.watchlist', [], { scope: 'user' });
  const [customSectors, setCustomSectors] = useStorage('financial.customSectors', [], { scope: 'user' });
  const [positions, setPositions] = useStorage('financial.positions', {}, { scope: 'user' });
  const [tickerNotes, setTickerNotes] = useStorage('financial.tickerNotes', {}, { scope: 'user' });
  const [followedAccounts, setFollowedAccounts] = useStorage('financial.followedAccounts', [], { scope: 'user' });
  const [lastAlertCheck, setLastAlertCheck] = useStorage('financial.lastAlertCheck', null, { scope: 'user' });

  // State
  const [activeView, setActiveView] = useState('dashboard');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSectors, setSelectedSectors] = useState([]);
  const [selectedCatalysts, setSelectedCatalysts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [tickerBrief, setTickerBrief] = useState(null);
  const [digest, setDigest] = useState(null);
  const [socialSearchPlatform, setSocialSearchPlatform] = useState('linkedin');
  const [socialSearchQuery, setSocialSearchQuery] = useState('');
  const [socialResults, setSocialResults] = useState([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState(null);
  const [hasSocialSearched, setHasSocialSearched] = useState(false);
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
  const [watchlistSearchQuery, setWatchlistSearchQuery] = useState('');
  const [watchlistSearchResults, setWatchlistSearchResults] = useState([]);
  const [watchlistSearching, setWatchlistSearching] = useState(false);
  const [watchlistQuotes, setWatchlistQuotes] = useState({});
  const [loadingWatchlistQuotes, setLoadingWatchlistQuotes] = useState({});
  const [hasSearched, setHasSearched] = useState(false);

  // Apply body background
  useEffect(() => {
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#000000';
    document.documentElement.style.minHeight = '100%';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      document.documentElement.style.minHeight = '';
    };
  }, []);

  // Load initial news
  useEffect(() => {
    loadNews();
    checkAlerts();
  }, []);

  // Load news when sectors change
  useEffect(() => {
    if (selectedSectors.length > 0) {
      loadNews();
    }
  }, [selectedSectors]);

  // Functions
  const loadNews = async () => {
    setLoading(true);
    try {
      let allNews = [];
      
      if (selectedSectors.length === 0) {
        const response = await miyagiAPI.post('/news-top-headlines', {
          category: 'business',
          country: 'us',
          pageSize: 50,
        });
        if (response.success) {
          allNews = response.data.articles || [];
        }
      } else {
        const allSectors = [...SECTORS, ...customSectors];
        const sectorQueries = selectedSectors
          .map(sectorId => {
            const sector = allSectors.find(s => s.id === sectorId);
            return sector?.keywords.join(' OR ') || '';
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

      const taggedNews = allNews.map(article => ({
        ...article,
        catalysts: detectCatalysts(article),
      }));

      const uniqueNews = Array.from(
        new Map(taggedNews.map(item => [item.url, item])).values()
      );

      setNews(uniqueNews);
    } catch (error) {
      console.error('Error loading news:', error);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const detectCatalysts = (article) => {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    return CATALYSTS.filter(catalyst =>
      catalyst.keywords.some(keyword => text.includes(keyword.toLowerCase()))
    ).map(c => c.id);
  };

  const clusterStories = (articles) => {
    const clusters = {};
    
    articles.forEach(article => {
      const words = article.title.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4);
      
      let bestCluster = null;
      let bestScore = 0;
      
      Object.keys(clusters).forEach(clusterKey => {
        const clusterWords = clusterKey.split(' ');
        const matches = words.filter(w => clusterWords.includes(w)).length;
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
        if (!clusters[keyWord]) {
          clusters[keyWord] = [];
        }
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
    stories.forEach(story => {
      story.catalysts?.forEach(cat => {
        catalystCounts[cat] = (catalystCounts[cat] || 0) + 1;
      });
    });
    return Object.entries(catalystCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  };

  const checkAlerts = async () => {
    if (watchlist.length === 0) return;
    
    try {
      const response = await miyagiAPI.post('/news-top-headlines', {
        category: 'business',
        country: 'us',
        pageSize: 100,
      });
      
      if (response.success) {
        const newStories = (response.data.articles || []).filter(article => {
          const text = `${article.title} ${article.description || ''}`.toLowerCase();
          return watchlist.some(ticker => text.includes(ticker.toLowerCase()));
        });
        
        setAlerts(newStories);
        setLastAlertCheck(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
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
        .map(a => `- ${a.title}`)
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
      const topMovers = watchlist.slice(0, 5).map(ticker => {
        const tickerNews = articles.filter(a => 
          `${a.title} ${a.description || ''}`.toLowerCase().includes(ticker.toLowerCase())
        );
        return { ticker, newsCount: tickerNews.length };
      }).sort((a, b) => b.newsCount - a.newsCount);
      
      const digestPrompt = `Generate a daily market digest based on these headlines:\n\n${articles.slice(0, 20).map(a => `- ${a.title}`).join('\n')}\n\nInclude: 1) Market summary, 2) Key movers (${topMovers.map(t => t.ticker).join(', ')}), 3) Catalysts to watch, 4) Actionable insights. Format as a professional newsletter.`;
      
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
      keywords: newSectorKeywords.split(',').map(k => k.trim()).filter(Boolean),
      custom: true,
    };
    setCustomSectors(prev => [...(prev || []), newSector]);
    setNewSectorName('');
    setNewSectorKeywords('');
  };

  const deleteCustomSector = (sectorId) => {
    setCustomSectors(prev => (prev || []).filter(s => s.id !== sectorId));
    setSelectedSectors(prev => prev.filter(s => s !== sectorId));
  };

  const searchSocial = async () => {
    if (!socialSearchQuery.trim()) return;
    
    setSocialLoading(true);
    setSocialError(null);
    setHasSocialSearched(true);
    
    try {
      if (socialSearchPlatform === 'linkedin') {
        // LinkedIn API accepts: name, company, title, education, location
        // We'll use the query as 'name' for person searches
        const response = await miyagiAPI.post('/linkedin-search-profiles', {
          name: socialSearchQuery,
        });
        
        if (response.success && response.data && response.data.profiles) {
          setSocialResults(response.data.profiles.map((profile, idx) => ({
            ...profile,
            id: profile.link || `linkedin-${profile.name}-${idx}`,
            platform: 'linkedin',
          })));
        } else {
          setSocialError(response.error || 'Failed to search LinkedIn profiles');
          setSocialResults([]);
        }
      } else if (socialSearchPlatform === 'youtube') {
        // YouTube API returns data.videos, not data.items
        console.log('[YouTube Search] Calling miyagiAPI with:', { q: socialSearchQuery, maxResults: 20 });
        
        const response = await miyagiAPI.post('/youtube-search', {
          q: socialSearchQuery,
          maxResults: 20,
        });
        
        console.log('[YouTube Search] Response:', response);
        
        if (response.success && response.data && response.data.videos) {
          console.log('[YouTube Search] Found videos:', response.data.videos.length);
          setSocialResults(response.data.videos.map((video, idx) => ({
            ...video,
            id: video.id?.videoId || video.id || `video-${idx}`,
            platform: 'youtube',
          })));
        } else {
          // Show specific error from backend
          console.error('[YouTube Search] Error response:', response);
          const errorMsg = response.error || response.message || 'Failed to search YouTube';
          setSocialError(`YouTube Error: ${errorMsg}. The DeepSpace YouTube integration may need configuration.`);
          setSocialResults([]);
        }
      }
    } catch (error) {
      console.error('Error searching social:', error);
      const errorMessage = error.message || error.toString();
      
      // Provide specific guidance based on error type
      if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
        setSocialError('YouTube API Error (400): Bad Request. Your YOUTUBE_API_KEY may be missing or invalid. Check your environment variables and ensure the key is set correctly.');
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setSocialError('YouTube API Error (403): Access Forbidden. Your API key may have incorrect restrictions. In Google Cloud Console → Credentials → API Key, set "Application restrictions" to "None" or "IP addresses" (not HTTP referrers, which block server requests).');
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
      acc => (acc.id === account.id || acc.id === account.snippet?.channelId) && acc.platform === account.platform
    );
    
    if (!isFollowing) {
      setFollowedAccounts(prev => [...(prev || []), account]);
    }
  };

  const unfollowAccount = (accountId, platform) => {
    setFollowedAccounts(prev =>
      (prev || []).filter(
        acc => !(acc.id === accountId && acc.platform === platform)
      )
    );
  };

  const searchWatchlistStocks = async () => {
    if (!watchlistSearchQuery.trim()) return;
    
    setWatchlistSearching(true);
    setHasSearched(true);
    try {
      const response = await miyagiAPI.post('/search-stocks', {
        query: watchlistSearchQuery,
      });
      
      if (response.success && response.data.results) {
        setWatchlistSearchResults(response.data.results);
      } else {
        setWatchlistSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching stocks:', error);
      setWatchlistSearchResults([]);
    } finally {
      setWatchlistSearching(false);
    }
  };

  const getQuoteForResult = async (symbol) => {
    setLoadingWatchlistQuotes(prev => ({ ...prev, [symbol]: true }));
    try {
      // Mock quote data for demo
      // In production, call actual quote API
      const mockQuote = {
        symbol: symbol,
        price: (Math.random() * 500 + 50).toFixed(2),
        change: (Math.random() * 20 - 10).toFixed(2),
        changePercent: (Math.random() * 10 - 5).toFixed(2),
        volume: Math.floor(Math.random() * 10000000),
        latestTradingDay: new Date().toISOString().split('T')[0],
      };
      
      setWatchlistQuotes(prev => ({
        ...prev,
        [symbol]: mockQuote,
      }));
    } catch (error) {
      console.error('Error getting quote:', error);
    } finally {
      setLoadingWatchlistQuotes(prev => ({ ...prev, [symbol]: false }));
    }
  };

  const addToWatchlistFromSearch = (symbol) => {
    const upperSymbol = symbol.toUpperCase();
    if (!watchlist.includes(upperSymbol)) {
      setWatchlist(prev => [...(prev || []), upperSymbol]);
    }
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
        query: ticker,
      });
      
      if (response.success && response.data.results && response.data.results.length > 0) {
        setWatchlist(prev => [...(prev || []), ticker]);
        setNewTickerInput('');
      } else {
        const confirm = window.confirm(`Could not verify ticker ${ticker}. Add anyway?`);
        if (confirm) {
          setWatchlist(prev => [...(prev || []), ticker]);
          setNewTickerInput('');
        }
      }
    } catch (error) {
      console.error('Error adding ticker:', error);
      setWatchlist(prev => [...(prev || []), ticker]);
      setNewTickerInput('');
    }
  };

  const refreshWatchlistQuote = async (ticker) => {
    setLoadingWatchlistQuotes(prev => ({ ...prev, [ticker]: true }));
    try {
      // Mock quote data for demo
      const mockQuote = {
        symbol: ticker,
        price: (Math.random() * 500 + 50).toFixed(2),
        change: (Math.random() * 20 - 10).toFixed(2),
        changePercent: (Math.random() * 10 - 5).toFixed(2),
        volume: Math.floor(Math.random() * 10000000),
        latestTradingDay: new Date().toISOString().split('T')[0],
      };
      
      setWatchlistQuotes(prev => ({
        ...prev,
        [ticker]: mockQuote,
      }));
    } catch (error) {
      console.error('Error refreshing quote:', error);
    } finally {
      setLoadingWatchlistQuotes(prev => ({ ...prev, [ticker]: false }));
    }
  };

  const searchPortfolioTicker = async () => {
    if (!portfolioSearchQuery.trim()) return;
    
    setPortfolioSearching(true);
    try {
      const response = await miyagiAPI.post('/search-stocks', {
        query: portfolioSearchQuery,
      });
      
      if (response.success && response.data.results) {
        setPortfolioSearchResults(response.data.results);
      } else {
        setPortfolioSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching stocks:', error);
      setPortfolioSearchResults([]);
    } finally {
      setPortfolioSearching(false);
    }
  };

  const addTickerToPortfolio = (ticker) => {
    // Add to watchlist if not already there
    if (!watchlist.includes(ticker)) {
      setWatchlist(prev => [...(prev || []), ticker]);
    }
    setPortfolioSearchQuery('');
    setPortfolioSearchResults([]);
  };

  const addPosition = (ticker, quantity, entryPrice) => {
    const tickerUpper = ticker.toUpperCase();
    setPositions(prev => ({
      ...(prev || {}),
      [tickerUpper]: {
        quantity: parseFloat(quantity),
        entryPrice: parseFloat(entryPrice),
        currentPrice: parseFloat(entryPrice),
        notes: tickerNotes[tickerUpper] || '',
      },
    }));
    setEditingPosition(null);
    setEditingPositionData({});
  };

  const updatePosition = (ticker, updates) => {
    setPositions(prev => ({
      ...(prev || {}),
      [ticker]: {
        ...(prev[ticker] || {}),
        ...updates,
      },
    }));
  };

  const deletePosition = (ticker) => {
    if (window.confirm(`Remove position for ${ticker}?`)) {
      setPositions(prev => {
        const newPositions = { ...(prev || {}) };
        delete newPositions[ticker];
        return newPositions;
      });
    }
  };

  const refreshQuote = async (ticker) => {
    setRefreshingQuotes(prev => ({ ...prev, [ticker]: true }));
    try {
      const response = await miyagiAPI.post('/search-stocks', {
        query: ticker,
      });
      
      if (response.success && response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        // For demo purposes, we'll use a mock current price
        // In a real app, you'd call /api/stocks/quote endpoint
        const mockCurrentPrice = positions[ticker]?.entryPrice * (1 + (Math.random() * 0.2 - 0.1));
        updatePosition(ticker, { currentPrice: mockCurrentPrice });
      }
    } catch (error) {
      console.error('Error refreshing quote:', error);
    } finally {
      setRefreshingQuotes(prev => ({ ...prev, [ticker]: false }));
    }
  };

  const updateTickerNotes = (ticker, notes) => {
    setTickerNotes(prev => ({
      ...(prev || {}),
      [ticker]: notes,
    }));
  };

  // Computed values
  const filteredNews = useMemo(() => {
    let filtered = news;
    
    if (selectedCatalysts.length > 0) {
      filtered = filtered.filter(article =>
        article.catalysts?.some(cat => selectedCatalysts.includes(cat))
      );
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article =>
        article.title?.toLowerCase().includes(query) ||
        article.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [news, selectedCatalysts, searchQuery]);

  const clusteredNews = useMemo(() => clusterStories(filteredNews), [filteredNews]);

  const stats = useMemo(() => ({
    totalStories: news.length,
    watchlistSize: watchlist.length,
    alertsCount: alerts.length,
    catalystsFound: new Set(news.flatMap(n => n.catalysts || [])).size,
  }), [news, watchlist, alerts]);

  // Styles - Clean Light UI
  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      backgroundColor: '#ffffff',
      color: '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", sans-serif',
      overflow: 'hidden',
    },
    sidebar: {
      width: '280px',
      borderRight: '1px solid #f0f0f0',
      padding: '32px 24px',
      overflowY: 'auto',
      backgroundColor: '#ffffff',
    },
    mainContent: {
      flex: 1,
      overflowY: 'auto',
      padding: '40px',
      backgroundColor: '#ffffff',
    },
    navButton: (isActive) => ({
      width: '100%',
      padding: '14px 16px',
      marginBottom: '8px',
      border: 'none',
      borderRadius: '10px',
      backgroundColor: isActive ? '#6366f1' : 'transparent',
      color: isActive ? '#ffffff' : '#000000',
      cursor: 'pointer',
      textAlign: 'left',
      fontSize: '15px',
      fontWeight: isActive ? '600' : '400',
      transition: 'all 0.2s',
    }),
    card: {
      padding: '32px',
      backgroundColor: '#ffffff',
      border: '1px solid #f0f0f0',
      borderRadius: '16px',
      marginBottom: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
    },
    input: {
      width: '100%',
      padding: '14px 18px',
      border: '1px solid #f0f0f0',
      borderRadius: '12px',
      fontSize: '15px',
      backgroundColor: '#ffffff',
      color: '#000000',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    button: (variant = 'primary') => ({
      padding: '12px 24px',
      backgroundColor: variant === 'primary' ? '#6366f1' : variant === 'danger' ? '#ef4444' : 'transparent',
      color: variant === 'primary' || variant === 'danger' ? '#ffffff' : '#000000',
      border: variant === 'ghost' ? '1px solid #f0f0f0' : 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '500',
      transition: 'all 0.2s',
    }),
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            📊 Command Center
          </h1>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>Financial market intelligence</p>
        </div>

        {/* Navigation */}
        <nav style={{ marginBottom: '40px' }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'watchlist', label: '⭐ Watchlist' },
            { id: 'alerts', label: '🔔 Alerts' },
            { id: 'ticker', label: '📰 Ticker Detail' },
            { id: 'digest', label: '📋 Digest' },
            { id: 'social', label: '🌐 Social' },
            { id: 'portfolio', label: '💼 Portfolio' },
            { id: 'sectors', label: '🏢 Sectors' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              style={styles.navButton(activeView === item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Stats */}
        <div style={{
          padding: '20px',
          backgroundColor: '#fafafa',
          borderRadius: '12px',
          marginBottom: '32px',
        }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px', fontWeight: '500' }}>
            Real-Time Stats
          </div>
          <div style={{ fontSize: '13px', lineHeight: '2' }}>
            <div>Stories: <strong>{stats.totalStories}</strong></div>
            <div>Watchlist: <strong>{stats.watchlistSize}</strong></div>
            <div>Alerts: <strong>{stats.alertsCount}</strong></div>
            <div>Catalysts: <strong>{stats.catalystsFound}</strong></div>
          </div>
        </div>

        {/* Sectors */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', color: '#000' }}>
            Sectors ({SECTORS.length + customSectors.length})
          </div>
          {[...SECTORS, ...customSectors].slice(0, 5).map(sector => (
            <label key={sector.id} style={{ display: 'block', marginBottom: '12px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedSectors.includes(sector.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedSectors(prev => [...prev, sector.id]);
                  } else {
                    setSelectedSectors(prev => prev.filter(s => s !== sector.id));
                  }
                }}
                style={{ marginRight: '10px' }}
              />
              {sector.name}
              {sector.custom && <span style={{ fontSize: '11px', color: '#6366f1', marginLeft: '6px' }}>(Custom)</span>}
            </label>
          ))}
          {customSectors.length + SECTORS.length > 5 && (
            <button
              onClick={() => setActiveView('sectors')}
              style={{
                marginTop: '12px',
                fontSize: '13px',
                color: '#6366f1',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              View All →
            </button>
          )}
        </div>

        {/* Catalysts */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '16px', color: '#000' }}>
            Catalysts
          </div>
          {CATALYSTS.map(catalyst => (
            <label key={catalyst.id} style={{ display: 'block', marginBottom: '12px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedCatalysts.includes(catalyst.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCatalysts(prev => [...prev, catalyst.id]);
                  } else {
                    setSelectedCatalysts(prev => prev.filter(c => c !== catalyst.id));
                  }
                }}
                style={{ marginRight: '10px' }}
              />
              <span style={{ color: catalyst.color }}>●</span> {catalyst.name}
            </label>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '600', letterSpacing: '-0.02em' }}>Market Dashboard</h2>
              <button onClick={loadNews} disabled={loading} style={styles.button('primary')}>
                {loading ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <input
                type="text"
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.input}
              />
            </div>

            {loading && news.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>Loading news...</div>
            ) : clusteredNews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>No news found. Try adjusting filters.</div>
            ) : (
              <div>
                {clusteredNews.map((cluster, idx) => (
                  <div key={idx} style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: '600' }}>
                        {cluster.key.charAt(0).toUpperCase() + cluster.key.slice(1)} ({cluster.size} stories)
                      </h3>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {cluster.topCatalysts.map(catId => {
                          const cat = CATALYSTS.find(c => c.id === catId);
                          return cat ? (
                            <span key={catId} style={{
                              padding: '6px 12px',
                              backgroundColor: cat.color + '15',
                              color: cat.color,
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}>
                              {cat.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                      {cluster.stories.slice(0, 6).map((article, aidx) => (
                        <a
                          key={aidx}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '20px',
                            backgroundColor: '#fafafa',
                            border: '1px solid #f0f0f0',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            color: '#000',
                            display: 'block',
                            transition: 'transform 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', lineHeight: '1.4' }}>
                            {article.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                            {article.source?.name || 'Unknown'} • {new Date(article.publishedAt).toLocaleDateString()}
                          </div>
                          {article.catalysts && article.catalysts.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {article.catalysts.map(catId => {
                                const cat = CATALYSTS.find(c => c.id === catId);
                                return cat ? (
                                  <span key={catId} style={{
                                    padding: '4px 8px',
                                    backgroundColor: cat.color + '15',
                                    color: cat.color,
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                  }}>
                                    {cat.name}
                                  </span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Watchlist View */}
        {activeView === 'watchlist' && (
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '32px', letterSpacing: '-0.02em' }}>Watchlist</h2>
            
            {/* Search Stocks */}
            <div style={styles.card}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Search Stocks</div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                Search by symbol, company name, or keywords to find stocks
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="e.g., AAPL, Apple, Tesla, tech stocks..."
                  value={watchlistSearchQuery}
                  onChange={(e) => setWatchlistSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchWatchlistStocks()}
                  style={{ ...styles.input, flex: 1 }}
                />
                <button
                  onClick={searchWatchlistStocks}
                  disabled={watchlistSearching || !watchlistSearchQuery.trim()}
                  style={{
                    ...styles.button('primary'),
                    opacity: watchlistSearching || !watchlistSearchQuery.trim() ? 0.5 : 1,
                  }}
                >
                  {watchlistSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              {watchlistSearching && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  Searching...
                </div>
              )}

              {!watchlistSearching && hasSearched && watchlistSearchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>No results found</div>
                  <div style={{ fontSize: '14px' }}>Try a different search term</div>
                </div>
              )}

              {!watchlistSearching && watchlistSearchResults.length > 0 && (
                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: '16px',
                }}>
                  {watchlistSearchResults.map((result, idx) => {
                    const isInWatchlist = watchlist.includes(result.symbol);
                    const quote = watchlistQuotes[result.symbol];
                    const loadingQuote = loadingWatchlistQuotes[result.symbol];

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '20px',
                          marginBottom: '12px',
                          backgroundColor: '#fafafa',
                          borderRadius: '12px',
                          border: '1px solid #f0f0f0',
                        }}
                      >
                        {/* Stock Info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                              {result.symbol}
                            </div>
                            <div style={{ fontSize: '14px', color: '#666', marginBottom: '6px' }}>
                              {result.name || 'No description'}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {result.type && (
                                <span style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#6366f115',
                                  color: '#6366f1',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                }}>
                                  {result.type}
                                </span>
                              )}
                              {result.region && (
                                <span style={{
                                  padding: '4px 8px',
                                  backgroundColor: '#f0f0f0',
                                  color: '#666',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                }}>
                                  {result.region}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => addToWatchlistFromSearch(result.symbol)}
                            disabled={isInWatchlist}
                            style={{
                              ...styles.button(isInWatchlist ? 'ghost' : 'primary'),
                              padding: '8px 16px',
                              fontSize: '13px',
                              marginLeft: '12px',
                            }}
                          >
                            {isInWatchlist ? '✓ Added' : '+ Add'}
                          </button>
                        </div>

                        {/* Quote Section */}
                        {!quote && !loadingQuote && (
                          <button
                            onClick={() => getQuoteForResult(result.symbol)}
                            style={{
                              ...styles.button('ghost'),
                              width: '100%',
                              padding: '8px',
                              fontSize: '13px',
                            }}
                          >
                            Get Quote
                          </button>
                        )}

                        {loadingQuote && (
                          <div style={{ textAlign: 'center', padding: '12px', color: '#999', fontSize: '13px' }}>
                            Loading quote...
                          </div>
                        )}

                        {quote && !loadingQuote && (
                          <div style={{
                            marginTop: '12px',
                            padding: '16px',
                            backgroundColor: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #f0f0f0',
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Price</div>
                                <div style={{ fontSize: '20px', fontWeight: '600' }}>${quote.price}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Change</div>
                                <div style={{
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: parseFloat(quote.change) >= 0 ? '#10b981' : '#ef4444'
                                }}>
                                  {parseFloat(quote.change) >= 0 ? '+' : ''}{quote.change} ({parseFloat(quote.changePercent) >= 0 ? '+' : ''}{quote.changePercent}%)
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Volume</div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                  {quote.volume.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Last Trade</div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                  {new Date(quote.latestTradingDay).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Add by Symbol */}
            <div style={styles.card}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Quick Add by Symbol</div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                Already know the ticker? Add it directly
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Enter ticker symbol (e.g., AAPL, TSLA)"
                  value={newTickerInput}
                  onChange={(e) => setNewTickerInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && addTickerToWatchlist()}
                  style={{ ...styles.input, flex: 1 }}
                />
                <button onClick={addTickerToWatchlist} style={styles.button('primary')}>Add</button>
              </div>
            </div>

            {/* Your Watchlist */}
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
                Your Watchlist ({watchlist.length})
              </h3>

              {watchlist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>No stocks in watchlist</div>
                  <div style={{ fontSize: '14px' }}>Search and add stocks above to start tracking</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {watchlist.map(ticker => {
                    const quote = watchlistQuotes[ticker];
                    const loadingQuote = loadingWatchlistQuotes[ticker];

                    return (
                      <div key={ticker} style={{
                        ...styles.card,
                        padding: '24px',
                      }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <div style={{ fontSize: '24px', fontWeight: '600' }}>{ticker}</div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {quote && !loadingQuote && (
                              <button
                                onClick={() => refreshWatchlistQuote(ticker)}
                                style={{
                                  ...styles.button('ghost'),
                                  padding: '6px 12px',
                                  fontSize: '13px',
                                }}
                                title="Refresh quote"
                              >
                                🔄
                              </button>
                            )}
                            <button
                              onClick={() => setWatchlist(prev => prev.filter(t => t !== ticker))}
                              style={{
                                ...styles.button('danger'),
                                padding: '6px 12px',
                                fontSize: '13px',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Quote Display */}
                        {!quote && !loadingQuote && (
                          <button
                            onClick={() => refreshWatchlistQuote(ticker)}
                            style={{
                              ...styles.button('ghost'),
                              width: '100%',
                              padding: '10px',
                              marginBottom: '12px',
                            }}
                          >
                            Get Quote
                          </button>
                        )}

                        {loadingQuote && (
                          <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>
                            Loading quote...
                          </div>
                        )}

                        {quote && !loadingQuote && (
                          <div style={{
                            padding: '16px',
                            backgroundColor: '#fafafa',
                            borderRadius: '10px',
                            marginBottom: '12px',
                          }}>
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Current Price</div>
                              <div style={{ fontSize: '28px', fontWeight: '600' }}>${quote.price}</div>
                            </div>
                            <div style={{ 
                              paddingTop: '12px',
                              borderTop: '1px solid #f0f0f0',
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '12px',
                            }}>
                              <div>
                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Change</div>
                                <div style={{
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: parseFloat(quote.change) >= 0 ? '#10b981' : '#ef4444'
                                }}>
                                  {parseFloat(quote.change) >= 0 ? '+' : ''}{quote.change}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Change %</div>
                                <div style={{
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: parseFloat(quote.changePercent) >= 0 ? '#10b981' : '#ef4444'
                                }}>
                                  {parseFloat(quote.changePercent) >= 0 ? '+' : ''}{quote.changePercent}%
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Volume</div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                  {quote.volume.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Last Trade</div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                  {new Date(quote.latestTradingDay).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <button
                          onClick={() => briefTicker(ticker)}
                          disabled={loading}
                          style={{
                            ...styles.button('primary'),
                            width: '100%',
                            padding: '10px',
                          }}
                        >
                          {loading && selectedTicker === ticker ? 'Loading...' : '✨ Brief Me'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alerts View */}
        {activeView === 'alerts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '600', letterSpacing: '-0.02em' }}>Alerts</h2>
              <button onClick={checkAlerts} disabled={loading} style={styles.button('primary')}>
                {loading ? 'Checking...' : '🔄 Check Alerts'}
              </button>
            </div>

            {lastAlertCheck && (
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                Last checked: {new Date(lastAlertCheck).toLocaleString()}
              </div>
            )}

            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
                No alerts. Your watchlist stocks haven't been mentioned recently.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {alerts.map((article, idx) => (
                  <a
                    key={idx}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '20px',
                      backgroundColor: '#fafafa',
                      border: '1px solid #f0f0f0',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: '#000',
                      display: 'block',
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', lineHeight: '1.4' }}>
                      {article.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {article.source?.name || 'Unknown'} • {new Date(article.publishedAt).toLocaleDateString()}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ticker Detail View */}
        {activeView === 'ticker' && (
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '32px', letterSpacing: '-0.02em' }}>Ticker Detail</h2>
            {!tickerBrief ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
                Select a ticker from Watchlist and click "Brief Me" to see details.
              </div>
            ) : (
              <div>
                <div style={styles.card}>
                  <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '20px' }}>
                    {tickerBrief.ticker} - Executive Brief
                  </h3>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', marginBottom: '32px', fontSize: '15px' }}>
                    {tickerBrief.summary}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Forecast Scenarios</h4>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '15px' }}>
                      {tickerBrief.forecast}
                    </div>
                  </div>
                </div>

                {tickerBrief.news.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>Recent News</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                      {tickerBrief.news.map((article, idx) => (
                        <a
                          key={idx}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '20px',
                            backgroundColor: '#fafafa',
                            border: '1px solid #f0f0f0',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            color: '#000',
                            display: 'block',
                          }}
                        >
                          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>
                            {article.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666' }}>
                            {article.source?.name || 'Unknown'} • {new Date(article.publishedAt).toLocaleDateString()}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Digest View */}
        {activeView === 'digest' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '600', letterSpacing: '-0.02em' }}>Daily Digest</h2>
              <button onClick={generateDigest} disabled={loading} style={styles.button('primary')}>
                {loading ? 'Generating...' : '📋 Generate Digest'}
              </button>
            </div>

            {!digest ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
                Click "Generate Digest" to create a daily market summary.
              </div>
            ) : (
              <div style={styles.card}>
                <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #f0f0f0' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>Daily Market Digest</h3>
                  <div style={{ fontSize: '14px', color: '#666' }}>{digest.date}</div>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '15px', marginBottom: '40px' }}>
                  {digest.content}
                </div>
                {digest.articles.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Key Articles</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                      {digest.articles.map((article, idx) => (
                        <a
                          key={idx}
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '16px',
                            backgroundColor: '#fafafa',
                            border: '1px solid #f0f0f0',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            color: '#000',
                            fontSize: '14px',
                          }}
                        >
                          {article.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Social View */}
        {activeView === 'social' && (
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '32px', letterSpacing: '-0.02em' }}>Social Tracking</h2>
            
            {/* Platform Toggle */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
              <button
                onClick={() => {
                  setSocialSearchPlatform('linkedin');
                  setSocialResults([]);
                }}
                style={{
                  padding: '14px 28px',
                  backgroundColor: socialSearchPlatform === 'linkedin' ? '#6366f1' : 'transparent',
                  color: socialSearchPlatform === 'linkedin' ? '#ffffff' : '#000000',
                  border: '1px solid #f0f0f0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                LinkedIn
              </button>
              <button
                onClick={() => {
                  setSocialSearchPlatform('youtube');
                  setSocialResults([]);
                }}
                style={{
                  padding: '14px 28px',
                  backgroundColor: socialSearchPlatform === 'youtube' ? '#6366f1' : 'transparent',
                  color: socialSearchPlatform === 'youtube' ? '#ffffff' : '#000000',
                  border: '1px solid #f0f0f0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                YouTube
              </button>
            </div>

            {/* Search */}
            <div style={styles.card}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Search {socialSearchPlatform === 'linkedin' ? 'LinkedIn' : 'YouTube'}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                {socialSearchPlatform === 'linkedin' 
                  ? 'Find professionals and thought leaders in the financial space'
                  : 'Discover financial content creators and market analysis videos'}
              </div>
              
              {/* YouTube API Notice */}
              {socialSearchPlatform === 'youtube' && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #dbeafe',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#1e40af',
                  lineHeight: '1.5',
                }}>
                  <strong>YouTube Search:</strong> This feature uses DeepSpace's YouTube integration. If you get a 400 error, the YOUTUBE_API_KEY may need to be configured in the DeepSpace system settings.
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder={`Search ${socialSearchPlatform === 'linkedin' ? 'LinkedIn profiles' : 'YouTube channels/videos'}...`}
                  value={socialSearchQuery}
                  onChange={(e) => setSocialSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchSocial()}
                  style={{ ...styles.input, flex: 1 }}
                />
                <button
                  onClick={searchSocial}
                  disabled={socialLoading || !socialSearchQuery.trim()}
                  style={{
                    ...styles.button('primary'),
                    opacity: socialLoading || !socialSearchQuery.trim() ? 0.5 : 1,
                  }}
                >
                  {socialLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              {/* Fallback: Search on YouTube.com */}
              {socialSearchPlatform === 'youtube' && socialSearchQuery.trim() && (
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(socialSearchQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    color: '#6366f1',
                    textAlign: 'center',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: '1px solid #f0f0f0',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  🔗 Or search "{socialSearchQuery}" on YouTube.com
                </a>
              )}
            </div>

            {/* Following Section */}
            {followedAccounts.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
                  Following ({followedAccounts.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {followedAccounts.map((account, idx) => {
                    const isLinkedIn = account.platform === 'linkedin';
                    const linkUrl = isLinkedIn 
                      ? (account.link || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(account.name || '')}`)
                      : (account.links?.watch || `https://www.youtube.com/results?search_query=${encodeURIComponent(account.snippet?.title || '')}`);
                    
                    return (
                      <div key={idx} style={{
                        ...styles.card,
                        padding: '24px',
                      }}>
                        <div style={{ marginBottom: '16px' }}>
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
                              marginBottom: '6px',
                            }}
                          >
                            {account.name || account.snippet?.title || 'Unknown'}
                          </a>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                            {isLinkedIn ? (account.headline || 'No headline') : (account.snippet?.channelTitle || 'No channel info')}
                          </div>
                          {isLinkedIn && account.location && (
                            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                              📍 {account.location}
                            </div>
                          )}
                          <span style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            backgroundColor: isLinkedIn ? '#0077b515' : '#ff000015',
                            color: isLinkedIn ? '#0077b5' : '#ff0000',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}>
                            {isLinkedIn ? 'LinkedIn' : 'YouTube'}
                          </span>
                        </div>
                        <button
                          onClick={() => unfollowAccount(account.id, account.platform)}
                          style={{
                            ...styles.button('danger'),
                            width: '100%',
                            padding: '10px',
                            fontSize: '14px',
                          }}
                        >
                          Unfollow
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search Results */}
            {socialLoading && (
              <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
                Searching {socialSearchPlatform}...
              </div>
            )}

            {!socialLoading && socialResults.length > 0 && (
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
                  Search Results ({socialResults.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {socialResults.map((result, idx) => {
                    const isLinkedIn = result.platform === 'linkedin';
                    const isFollowing = followedAccounts.some(
                      acc => acc.id === result.id && acc.platform === result.platform
                    );
                    
                    // Use proper link from API or construct fallback
                    const linkUrl = isLinkedIn
                      ? (result.link || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(result.name || '')}`)
                      : (result.links?.watch || `https://www.youtube.com/results?search_query=${encodeURIComponent(result.snippet?.title || '')}`);

                    return (
                      <div key={idx} style={{
                        ...styles.card,
                        padding: '24px',
                      }}>
                        <div style={{ marginBottom: '16px' }}>
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
                              marginBottom: '6px',
                            }}
                          >
                            {result.name || result.snippet?.title || 'Unknown'}
                          </a>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px', lineHeight: '1.5' }}>
                            {isLinkedIn ? (result.headline || 'No headline') : (result.snippet?.channelTitle || 'No channel info')}
                          </div>
                          
                          {/* Description for YouTube */}
                          {!isLinkedIn && result.snippet?.description && (
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#999', 
                              marginBottom: '8px',
                              lineHeight: '1.4',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {result.snippet.description}
                            </div>
                          )}
                          
                          {/* Additional metadata */}
                          {isLinkedIn && result.location && (
                            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                              📍 {result.location}
                            </div>
                          )}
                          {!isLinkedIn && result.snippet?.publishedAt && (
                            <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                              📅 {new Date(result.snippet.publishedAt).toLocaleDateString()}
                            </div>
                          )}
                          
                          <span style={{
                            display: 'inline-block',
                            padding: '6px 12px',
                            backgroundColor: isLinkedIn ? '#0077b515' : '#ff000015',
                            color: isLinkedIn ? '#0077b5' : '#ff0000',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}>
                            {isLinkedIn ? 'LinkedIn' : 'YouTube'}
                          </span>
                        </div>
                        <button
                          onClick={() => isFollowing 
                            ? unfollowAccount(result.id, result.platform) 
                            : followAccount(result)
                          }
                          style={{
                            ...styles.button(isFollowing ? 'ghost' : 'primary'),
                            width: '100%',
                            padding: '10px',
                            fontSize: '14px',
                          }}
                        >
                          {isFollowing ? '✓ Following' : '+ Follow'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error State */}
            {socialError && (
              <div style={{
                ...styles.card,
                backgroundColor: '#fef2f2',
                borderColor: '#fecaca',
                padding: '24px',
              }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '12px' }}>
                  {socialSearchPlatform === 'youtube' ? 'YouTube Search Error' : 'LinkedIn Search Error'}
                </div>
                <div style={{ fontSize: '14px', color: '#991b1b', marginBottom: '16px', lineHeight: '1.6' }}>
                  {socialError}
                </div>
                
                {/* Detailed help for YouTube 400 error + Fallback */}
                {socialSearchPlatform === 'youtube' && (
                  <div>
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#fff7ed',
                      border: '1px solid #fed7aa',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#92400e',
                      lineHeight: '1.6',
                      marginBottom: '16px',
                    }}>
                      <strong>Troubleshooting YouTube 400 Error:</strong>
                      <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                        <li>DeepSpace's YouTube integration requires a valid YOUTUBE_API_KEY</li>
                        <li>Check if the API key is configured in DeepSpace's system settings</li>
                        <li>The key should have "YouTube Data API v3" enabled in Google Cloud Console</li>
                        <li>API key restrictions should be set to "None" or "IP addresses" (not HTTP referrers)</li>
                        <li>Contact DeepSpace support if the integration needs to be configured</li>
                      </ul>
                    </div>
                    
                    {/* Fallback: Open YouTube Search */}
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(socialSearchQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        padding: '14px 20px',
                        backgroundColor: '#6366f1',
                        color: '#ffffff',
                        textAlign: 'center',
                        textDecoration: 'none',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                      }}
                    >
                      🔍 Search "{socialSearchQuery}" on YouTube.com
                    </a>
                  </div>
                )}
              </div>
            )}

            {!socialLoading && !socialError && socialResults.length === 0 && hasSocialSearched && (
              <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>No results found</div>
                <div style={{ fontSize: '14px' }}>
                  {socialSearchPlatform === 'linkedin' 
                    ? 'Try searching for a person\'s name or company'
                    : 'Try different keywords or video topics'}
                </div>
              </div>
            )}

            {!socialLoading && socialResults.length === 0 && !hasSocialSearched && followedAccounts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>Start exploring</div>
                <div style={{ fontSize: '14px' }}>Search for professionals or content creators to follow</div>
              </div>
            )}
          </div>
        )}

        {/* Portfolio View */}
        {activeView === 'portfolio' && (
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '32px', letterSpacing: '-0.02em' }}>Portfolio</h2>
            
            {/* Portfolio Summary */}
            {Object.keys(positions).length > 0 && (
              <div style={{
                ...styles.card,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#ffffff',
                marginBottom: '32px',
              }}>
                <div style={{ fontSize: '16px', marginBottom: '20px', opacity: 0.9 }}>Portfolio Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                  {(() => {
                    const totalCost = Object.values(positions).reduce((sum, pos) => sum + (pos.quantity * pos.entryPrice), 0);
                    const totalValue = Object.values(positions).reduce((sum, pos) => sum + (pos.quantity * pos.currentPrice), 0);
                    const totalPnl = totalValue - totalCost;
                    const totalPnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
                    
                    return (
                      <>
                        <div>
                          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>Total Cost</div>
                          <div style={{ fontSize: '28px', fontWeight: '600' }}>${totalCost.toFixed(2)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>Current Value</div>
                          <div style={{ fontSize: '28px', fontWeight: '600' }}>${totalValue.toFixed(2)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>Total P&L</div>
                          <div style={{ fontSize: '28px', fontWeight: '600' }}>
                            ${totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '16px', marginTop: '4px', opacity: 0.9 }}>
                            {totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '6px' }}>Positions</div>
                          <div style={{ fontSize: '28px', fontWeight: '600' }}>{Object.keys(positions).length}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Search & Add Ticker */}
            <div style={styles.card}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Add Stock to Portfolio</div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                Search for a stock symbol to add to your watchlist or create a position
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Search ticker symbol (e.g., AAPL, TSLA, MSFT)..."
                  value={portfolioSearchQuery}
                  onChange={(e) => setPortfolioSearchQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && searchPortfolioTicker()}
                  style={{ ...styles.input, flex: 1 }}
                />
                <button
                  onClick={searchPortfolioTicker}
                  disabled={portfolioSearching || !portfolioSearchQuery.trim()}
                  style={{
                    ...styles.button('primary'),
                    opacity: portfolioSearching || !portfolioSearchQuery.trim() ? 0.5 : 1,
                  }}
                >
                  {portfolioSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              {portfolioSearchResults.length > 0 && (
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto', 
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: '16px',
                }}>
                  {portfolioSearchResults.map((result, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        backgroundColor: '#fafafa',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                          {result.symbol}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          {result.name || 'No description available'}
                        </div>
                      </div>
                      <button
                        onClick={() => addTickerToPortfolio(result.symbol)}
                        style={{
                          ...styles.button(watchlist.includes(result.symbol) ? 'ghost' : 'primary'),
                          padding: '8px 16px',
                          fontSize: '13px',
                        }}
                      >
                        {watchlist.includes(result.symbol) ? '✓ Added' : '+ Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Positions List */}
            {watchlist.length === 0 && Object.keys(positions).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>No stocks in portfolio</div>
                <div style={{ fontSize: '14px' }}>Search and add stocks to start tracking your portfolio</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                {/* Get unique tickers from both watchlist and positions */}
                {[...new Set([...watchlist, ...Object.keys(positions)])].map(ticker => {
                  const position = positions[ticker];
                  const hasPosition = !!position;
                  const isEditing = editingPosition === ticker;
                  const notes = tickerNotes[ticker] || '';
                  
                  // Calculate P&L if position exists
                  const pnl = hasPosition ? (position.currentPrice - position.entryPrice) * position.quantity : 0;
                  const pnlPercent = hasPosition ? ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100 : 0;
                  const costBasis = hasPosition ? position.quantity * position.entryPrice : 0;
                  const currentValue = hasPosition ? position.quantity * position.currentPrice : 0;
                  
                  return (
                    <div key={ticker} style={{
                      ...styles.card,
                      padding: '24px',
                    }}>
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>{ticker}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {hasPosition && (
                            <button
                              onClick={() => refreshQuote(ticker)}
                              disabled={refreshingQuotes[ticker]}
                              style={{
                                ...styles.button('ghost'),
                                padding: '6px 12px',
                                fontSize: '13px',
                                opacity: refreshingQuotes[ticker] ? 0.5 : 1,
                              }}
                              title="Refresh quote"
                            >
                              {refreshingQuotes[ticker] ? '...' : '🔄'}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setWatchlist(prev => prev.filter(t => t !== ticker));
                              if (hasPosition) deletePosition(ticker);
                            }}
                            style={{
                              ...styles.button('danger'),
                              padding: '6px 12px',
                              fontSize: '13px',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Position Form (Add/Edit) */}
                      {isEditing ? (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>Quantity</div>
                              <input
                                type="number"
                                placeholder="Shares"
                                value={editingPositionData.quantity || ''}
                                onChange={(e) => setEditingPositionData({ ...editingPositionData, quantity: e.target.value })}
                                style={styles.input}
                              />
                            </div>
                            <div>
                              <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>Entry Price</div>
                              <input
                                type="number"
                                placeholder="$0.00"
                                step="0.01"
                                value={editingPositionData.entryPrice || ''}
                                onChange={(e) => setEditingPositionData({ ...editingPositionData, entryPrice: e.target.value })}
                                style={styles.input}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => {
                                if (editingPositionData.quantity && editingPositionData.entryPrice) {
                                  addPosition(ticker, editingPositionData.quantity, editingPositionData.entryPrice);
                                }
                              }}
                              style={{
                                ...styles.button('primary'),
                                flex: 1,
                                padding: '10px',
                              }}
                              disabled={!editingPositionData.quantity || !editingPositionData.entryPrice}
                            >
                              Save Position
                            </button>
                            <button
                              onClick={() => {
                                setEditingPosition(null);
                                setEditingPositionData({});
                              }}
                              style={{
                                ...styles.button('ghost'),
                                flex: 1,
                                padding: '10px',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : hasPosition ? (
                        <div>
                          {/* Position Details */}
                          <div style={{ 
                            padding: '16px', 
                            backgroundColor: '#fafafa', 
                            borderRadius: '10px', 
                            marginBottom: '16px' 
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Shares</div>
                                <div style={{ fontSize: '16px', fontWeight: '600' }}>{position.quantity}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Entry Price</div>
                                <div style={{ fontSize: '16px', fontWeight: '600' }}>${position.entryPrice.toFixed(2)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Current Price</div>
                                <div style={{ fontSize: '16px', fontWeight: '600' }}>${position.currentPrice.toFixed(2)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>P&L per Share</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: pnl >= 0 ? '#10b981' : '#ef4444' }}>
                                  ${(position.currentPrice - position.entryPrice).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            <div style={{ 
                              paddingTop: '12px', 
                              borderTop: '1px solid #f0f0f0',
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '12px',
                            }}>
                              <div>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Cost Basis</div>
                                <div style={{ fontSize: '18px', fontWeight: '600' }}>${costBasis.toFixed(2)}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Current Value</div>
                                <div style={{ fontSize: '18px', fontWeight: '600' }}>${currentValue.toFixed(2)}</div>
                              </div>
                            </div>
                            <div style={{ 
                              marginTop: '12px',
                              paddingTop: '12px', 
                              borderTop: '1px solid #f0f0f0',
                            }}>
                              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total P&L</div>
                              <div style={{ 
                                fontSize: '24px', 
                                fontWeight: '600',
                                color: pnl >= 0 ? '#10b981' : '#ef4444'
                              }}>
                                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                <span style={{ fontSize: '16px', marginLeft: '8px' }}>
                                  ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              setEditingPosition(ticker);
                              setEditingPositionData({
                                quantity: position.quantity,
                                entryPrice: position.entryPrice,
                              });
                            }}
                            style={{
                              ...styles.button('ghost'),
                              width: '100%',
                              padding: '10px',
                              marginBottom: '12px',
                            }}
                          >
                            Edit Position
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPosition(ticker);
                            setEditingPositionData({ quantity: '', entryPrice: '' });
                          }}
                          style={{
                            ...styles.button('primary'),
                            width: '100%',
                            padding: '12px',
                            marginBottom: '16px',
                          }}
                        >
                          + Add Position
                        </button>
                      )}

                      {/* Notes */}
                      <div>
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>Notes</div>
                        <textarea
                          placeholder="Add notes about this stock..."
                          value={notes}
                          onChange={(e) => updateTickerNotes(ticker, e.target.value)}
                          style={{
                            ...styles.input,
                            minHeight: '80px',
                            resize: 'vertical',
                            fontFamily: 'inherit',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sectors View */}
        {activeView === 'sectors' && (
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '32px', letterSpacing: '-0.02em' }}>Sectors</h2>
            
            <div style={styles.card}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Add Custom Sector</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Sector Name"
                  value={newSectorName}
                  onChange={(e) => setNewSectorName(e.target.value)}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Keywords (comma-separated)"
                  value={newSectorKeywords}
                  onChange={(e) => setNewSectorKeywords(e.target.value)}
                  style={styles.input}
                />
                <button onClick={addCustomSector} style={styles.button('primary')}>Add</button>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>All Sectors</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {[...SECTORS, ...customSectors].map(sector => (
                  <div key={sector.id} style={{
                    padding: '16px',
                    backgroundColor: '#fafafa',
                    border: '1px solid #f0f0f0',
                    borderRadius: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>
                        {sector.name}
                        {sector.custom && <span style={{ fontSize: '11px', color: '#6366f1', marginLeft: '6px' }}>(Custom)</span>}
                      </div>
                      {sector.custom && (
                        <button
                          onClick={() => deleteCustomSector(sector.id)}
                          style={{ ...styles.button('danger'), padding: '4px 8px', fontSize: '12px' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {sector.keywords.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FinancialCommandCenter;
