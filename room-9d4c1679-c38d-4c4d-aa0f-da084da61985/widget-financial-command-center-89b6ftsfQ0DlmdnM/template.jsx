import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// Default sector definitions (user can add custom ones)
const DEFAULT_SECTORS = [
  { id: 'technology', name: 'Technology', keywords: 'tech software AI cloud computing semiconductor', custom: false },
  { id: 'healthcare', name: 'Healthcare', keywords: 'healthcare biotech pharmaceutical drug medical', custom: false },
  { id: 'finance', name: 'Finance', keywords: 'bank finance fintech payment cryptocurrency banking', custom: false },
  { id: 'energy', name: 'Energy', keywords: 'energy oil gas renewable solar wind electric', custom: false },
  { id: 'consumer', name: 'Consumer', keywords: 'retail consumer ecommerce shopping consumer', custom: false },
  { id: 'industrial', name: 'Industrial', keywords: 'manufacturing industrial aerospace defense', custom: false },
  { id: 'realestate', name: 'Real Estate', keywords: 'real estate property housing REIT construction', custom: false },
  { id: 'materials', name: 'Materials', keywords: 'materials mining metals commodities gold silver', custom: false }
];

// Catalyst types
const CATALYSTS = [
  { id: 'earnings', name: 'Earnings', color: '#10b981' },
  { id: 'guidance', name: 'Guidance', color: '#3b82f6' },
  { id: 'macro', name: 'Macro', color: '#f59e0b' },
  { id: 'regulation', name: 'Regulation', color: '#ef4444' },
  { id: 'product', name: 'Product', color: '#8b5cf6' },
  { id: 'merger', name: 'M&A', color: '#ec4899' }
];

function FinancialCommandCenter() {
  const [tailwindLoaded, setTailwindLoaded] = useState(false);
  
  // Theme
  const [darkMode, setDarkMode] = useStorage('fcc-dark-mode', false);
  
  // Navigation
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedTicker, setSelectedTicker] = useState(null);
  
  // Watchlists & Portfolio
  const [watchlists, setWatchlists] = useStorage('fcc-watchlists', [
    { id: 'default', name: 'My Watchlist', tickers: [] }
  ]);
  const [activeWatchlist, setActiveWatchlist] = useState('default');
  const [tickerNotes, setTickerNotes] = useStorage('fcc-ticker-notes', {});
  const [positions, setPositions] = useStorage('fcc-positions', {});
  
  // Custom Sectors
  const [customSectors, setCustomSectors] = useStorage('fcc-custom-sectors', []);
  const [showAddSector, setShowAddSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorKeywords, setNewSectorKeywords] = useState('');
  
  // Social Tracking
  const [followedAccounts, setFollowedAccounts] = useStorage('fcc-followed-accounts', []);
  const [socialSearchPlatform, setSocialSearchPlatform] = useState('linkedin');
  const [socialSearchQuery, setSocialSearchQuery] = useState('');
  const [socialResults, setSocialResults] = useState([]);
  const [socialLoading, setSocialLoading] = useState(false);
  
  // Filters
  const [selectedSectors, setSelectedSectors] = useState([]);
  const [selectedCatalysts, setSelectedCatalysts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [tickerData, setTickerData] = useState({});
  const [digest, setDigest] = useState('');
  const [forecast, setForecast] = useState(null);
  
  // UI State
  const [showAddTicker, setShowAddTicker] = useState(false);
  const [tickerSearch, setTickerSearch] = useState('');
  const [tickerResults, setTickerResults] = useState([]);
  const [briefLoading, setBriefLoading] = useState(false);
  const [digestLoading, setDigestLoading] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  
  // Alerts
  const [alerts, setAlerts] = useStorage('fcc-alerts', []);
  const [lastCheck, setLastCheck] = useStorage('fcc-last-check', null);
  
  // Combine default and custom sectors
  const SECTORS = useMemo(() => {
    return [...DEFAULT_SECTORS, ...customSectors];
  }, [customSectors]);

  // Theme colors
  const theme = useMemo(() => ({
    bg: darkMode ? '#0a0a0a' : '#ffffff',
    bgSecondary: darkMode ? '#1a1a1a' : '#fafafa',
    bgCard: darkMode ? '#151515' : '#ffffff',
    border: darkMode ? '#2a2a2a' : '#f0f0f0',
    text: darkMode ? '#ffffff' : '#000000',
    textSecondary: darkMode ? '#a0a0a0' : '#666666',
    textTertiary: darkMode ? '#666666' : '#999999',
    accent: '#6366f1',
    accentHover: '#5558e3',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444'
  }), [darkMode]);

  useEffect(() => {
    // Load Tailwind CSS
    if (!document.getElementById('tailwind-script')) {
      const tailwindScript = document.createElement('script');
      tailwindScript.id = 'tailwind-script';
      tailwindScript.src = 'https://cdn.tailwindcss.com';
      tailwindScript.onload = () => {
        setTimeout(() => setTailwindLoaded(true), 100);
      };
      document.head.appendChild(tailwindScript);
    } else {
      setTailwindLoaded(true);
    }
    
    // Add print styles
    if (!document.getElementById('print-styles')) {
      const printStyles = document.createElement('style');
      printStyles.id = 'print-styles';
      printStyles.textContent = `
        @media print {
          @page {
            margin: 1in;
          }
          body {
            background: white !important;
            color: black !important;
          }
          #digest-content {
            font-size: 12pt !important;
            line-height: 1.6 !important;
            color: black !important;
          }
          button, .no-print {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(printStyles);
    }
    
    // Apply background
    document.body.style.background = darkMode ? '#0a0a0a' : '#ffffff';
    document.documentElement.style.minHeight = '100%';
    return () => {
      document.body.style.background = '';
      document.documentElement.style.minHeight = '';
    };
  }, [darkMode]);

  // Load initial news
  useEffect(() => {
    if (tailwindLoaded) {
      fetchNews();
    }
  }, [tailwindLoaded, selectedSectors]);

  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      let articles = [];
      
      if (selectedSectors.length > 0) {
        // Fetch news for each selected sector
        for (const sectorId of selectedSectors) {
          const sector = SECTORS.find(s => s.id === sectorId);
          const response = await miyagiAPI.post('/news-search', {
            q: sector.keywords.split(' ')[0],
            pageSize: 10,
            sortBy: 'publishedAt'
          });
          if (response.success && response.data.articles) {
            articles = [...articles, ...response.data.articles.map(a => ({ ...a, sector: sector.name }))];
          }
        }
      } else {
        // Default: business news
        const response = await miyagiAPI.post('/news-top-headlines', {
          category: 'business',
          pageSize: 20
        });
        if (response.success && response.data.articles) {
          articles = response.data.articles;
        }
      }
      
      // Analyze and tag catalysts
      const taggedArticles = await tagCatalysts(articles);
      setNews(taggedArticles);
      
      // Check for alerts
      checkAlerts(taggedArticles);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  const tagCatalysts = async (articles) => {
    const tagged = articles.map(article => {
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      const catalysts = [];
      
      if (text.match(/earnings|profit|revenue|quarterly/)) catalysts.push('earnings');
      if (text.match(/guidance|forecast|outlook|expects/)) catalysts.push('guidance');
      if (text.match(/fed|inflation|interest rate|economy|gdp/)) catalysts.push('macro');
      if (text.match(/regulation|law|sec|regulatory|compliance/)) catalysts.push('regulation');
      if (text.match(/product|launch|release|unveil/)) catalysts.push('product');
      if (text.match(/merger|acquisition|deal|buyout|takeover/)) catalysts.push('merger');
      
      return { ...article, catalysts };
    });
    
    return tagged;
  };

  const checkAlerts = (articles) => {
    const currentWatchlist = watchlists.find(w => w.id === activeWatchlist);
    if (!currentWatchlist || currentWatchlist.tickers.length === 0) return;
    
    const newAlerts = [];
    currentWatchlist.tickers.forEach(ticker => {
      const relevantArticles = articles.filter(a => 
        a.title.includes(ticker.symbol) || a.description?.includes(ticker.symbol)
      );
      
      if (relevantArticles.length > 0) {
        relevantArticles.forEach(article => {
          newAlerts.push({
            id: Date.now() + Math.random(),
            ticker: ticker.symbol,
            title: article.title,
            url: article.url,
            timestamp: new Date().toISOString(),
            catalysts: article.catalysts
          });
        });
      }
    });
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Keep last 50 alerts
    }
    setLastCheck(new Date().toISOString());
  };

  const searchTickers = async () => {
    if (!tickerSearch.trim()) return;
    
    try {
      const response = await miyagiAPI.post('/search-stocks', {
        term: tickerSearch
      });
      if (response.success) {
        setTickerResults(response.data.symbols || []);
      }
    } catch (error) {
      console.error('Error searching tickers:', error);
    }
  };

  const addToWatchlist = (ticker) => {
    setWatchlists(prev => prev.map(wl => {
      if (wl.id === activeWatchlist) {
        if (!wl.tickers.find(t => t.symbol === ticker.symbol)) {
          return { ...wl, tickers: [...wl.tickers, ticker] };
        }
      }
      return wl;
    }));
    setShowAddTicker(false);
    setTickerSearch('');
    setTickerResults([]);
  };

  const removeFromWatchlist = (symbol) => {
    setWatchlists(prev => prev.map(wl => {
      if (wl.id === activeWatchlist) {
        return { ...wl, tickers: wl.tickers.filter(t => t.symbol !== symbol) };
      }
      return wl;
    }));
  };

  const briefMe = async (ticker) => {
    setSelectedTicker(ticker);
    setActiveView('ticker-detail');
    setBriefLoading(true);
    setForecast(null);
    
    try {
      // Search news for this ticker
      const newsResponse = await miyagiAPI.post('/news-search', {
        q: `${ticker.symbol} ${ticker.name}`,
        pageSize: 10,
        sortBy: 'publishedAt'
      });
      
      let tickerNews = [];
      if (newsResponse.success && newsResponse.data.articles) {
        tickerNews = await tagCatalysts(newsResponse.data.articles);
      }
      
      // Generate AI brief
      const newsText = tickerNews.slice(0, 5).map(a => `- ${a.title}`).join('\n');
      const briefPrompt = `Based on recent news about ${ticker.name} (${ticker.symbol}):

${newsText}

Provide a concise brief covering:
1. Key developments (2-3 sentences)
2. Why this matters for investors (2 sentences)
3. Main catalysts or risks to watch

Keep it factual and actionable.`;
      
      const briefResponse = await miyagiAPI.post('/generate-text', {
        prompt: briefPrompt,
        provider: 'openai',
        model: 'gpt-4o-mini',
        max_tokens: 300
      });
      
      const brief = briefResponse.success ? briefResponse.data.text : 'Unable to generate brief.';
      
      // Generate forecast scenarios
      const forecastPrompt = `Based on ${ticker.name} (${ticker.symbol}) recent news and market context, provide three brief scenarios:

BULL CASE (1-2 sentences):
BASE CASE (1-2 sentences):
BEAR CASE (1-2 sentences):

Focus on realistic near-term outcomes.`;
      
      const forecastResponse = await miyagiAPI.post('/generate-text', {
        prompt: forecastPrompt,
        provider: 'openai',
        model: 'gpt-4o-mini',
        max_tokens: 250
      });
      
      const forecastText = forecastResponse.success ? forecastResponse.data.text : null;
      
      setTickerData({
        ...ticker,
        news: tickerNews,
        brief,
        forecast: forecastText
      });
      
    } catch (error) {
      console.error('Error briefing ticker:', error);
    } finally {
      setBriefLoading(false);
    }
  };

  const generateDigest = async (period = 'daily') => {
    setDigestLoading(true);
    
    try {
      const currentWatchlist = watchlists.find(w => w.id === activeWatchlist);
      const tickers = currentWatchlist?.tickers || [];
      const tickerSymbols = tickers.map(t => t.symbol).join(', ');
      
      const sectorsText = selectedSectors.length > 0 
        ? selectedSectors.map(s => SECTORS.find(sec => sec.id === s)?.name).join(', ')
        : 'general markets';
      
      const topNews = news.slice(0, 10).map(a => 
        `- ${a.title} [${a.catalysts.join(', ') || 'general'}]`
      ).join('\n');
      
      const digestPrompt = `Create a ${period} market digest covering:

WATCHLIST: ${tickerSymbols || 'None set'}
SECTORS: ${sectorsText}

TOP HEADLINES:
${topNews}

Provide:
1. Market Summary (2-3 sentences)
2. Key Movers & Why (3-4 bullet points)
3. Catalysts to Watch (2-3 items)
4. Actionable Insights (2 recommendations)

Keep it concise and investor-focused.`;
      
      const response = await miyagiAPI.post('/generate-text', {
        prompt: digestPrompt,
        provider: 'openai',
        model: 'gpt-4o-mini',
        max_tokens: 500
      });
      
      if (response.success) {
        setDigest(response.data.text);
        setActiveView('digest');
      }
    } catch (error) {
      console.error('Error generating digest:', error);
    } finally {
      setDigestLoading(false);
    }
  };

  const fetchSocialData = async (platform, query) => {
    try {
      if (platform === 'linkedin') {
        const response = await miyagiAPI.post('/linkedin-search-profiles', {
          name: query
        });
        if (response.success) {
          return response.data.profiles || [];
        }
      } else if (platform === 'youtube') {
        const response = await miyagiAPI.post('/youtube-search', {
          query: query,
          maxResults: 10
        });
        if (response.success) {
          return response.data.videos || [];
        }
      }
    } catch (error) {
      console.error('Error fetching social data:', error);
    }
    return [];
  };

  const toggleSector = (sectorId) => {
    setSelectedSectors(prev => 
      prev.includes(sectorId) 
        ? prev.filter(s => s !== sectorId)
        : [...prev, sectorId]
    );
  };

  const toggleCatalyst = (catalystId) => {
    setSelectedCatalysts(prev => 
      prev.includes(catalystId) 
        ? prev.filter(c => c !== catalystId)
        : [...prev, catalystId]
    );
  };

  // NEW: Custom Sector Management
  const addCustomSector = () => {
    if (!newSectorName.trim() || !newSectorKeywords.trim()) return;
    
    const newSector = {
      id: `custom-${Date.now()}`,
      name: newSectorName.trim(),
      keywords: newSectorKeywords.trim(),
      custom: true
    };
    
    setCustomSectors(prev => [...prev, newSector]);
    setNewSectorName('');
    setNewSectorKeywords('');
    setShowAddSector(false);
  };

  const deleteCustomSector = (sectorId) => {
    setCustomSectors(prev => prev.filter(s => s.id !== sectorId));
    setSelectedSectors(prev => prev.filter(s => s !== sectorId));
  };

  // NEW: Social Tracking
  const searchSocial = async () => {
    if (!socialSearchQuery.trim()) return;
    
    setSocialLoading(true);
    try {
      if (socialSearchPlatform === 'linkedin') {
        const response = await miyagiAPI.post('/linkedin-search-profiles', {
          name: socialSearchQuery
        });
        if (response.success) {
          setSocialResults(response.data.profiles || []);
        }
      } else if (socialSearchPlatform === 'youtube') {
        const response = await miyagiAPI.post('/youtube-search', {
          query: socialSearchQuery + ' finance investing',
          maxResults: 15
        });
        if (response.success) {
          setSocialResults(response.data.videos || []);
        }
      }
    } catch (error) {
      console.error('Error searching social:', error);
    } finally {
      setSocialLoading(false);
    }
  };

  const followAccount = (account) => {
    const accountData = {
      ...account,
      platform: socialSearchPlatform,
      followedAt: new Date().toISOString()
    };
    
    setFollowedAccounts(prev => {
      const exists = prev.find(a => 
        a.platform === socialSearchPlatform && 
        (a.link === account.link || a.videoId === account.videoId)
      );
      if (exists) return prev;
      return [...prev, accountData];
    });
  };

  const unfollowAccount = (account) => {
    setFollowedAccounts(prev => prev.filter(a => 
      !(a.platform === account.platform && 
        (a.link === account.link || a.videoId === account.videoId))
    ));
  };

  // NEW: Portfolio/Position Management
  const updatePosition = (symbol, positionData) => {
    setPositions(prev => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        ...positionData,
        updatedAt: new Date().toISOString()
      }
    }));
    setEditingPosition(null);
  };

  const deletePosition = (symbol) => {
    setPositions(prev => {
      const newPositions = { ...prev };
      delete newPositions[symbol];
      return newPositions;
    });
  };

  const parsePriceFromNews = (article) => {
    // Try to extract price changes from article text
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    const priceMatch = text.match(/(?:up|down|gains?|loses?|falls?|rises?)\s+(\d+\.?\d*)%/i);
    if (priceMatch) {
      return {
        change: priceMatch[0],
        percentage: parseFloat(priceMatch[1])
      };
    }
    return null;
  };

  // NEW: Email Digest
  const emailDigest = async () => {
    if (!digest) {
      alert('Please generate a digest first!');
      return;
    }
    
    setEmailLoading(true);
    try {
      const response = await miyagiAPI.post('/send-email', {
        to: '', // Will use authenticated user's email
        subject: `Market Digest - ${new Date().toLocaleDateString()}`,
        body: `
<html>
<body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #6366f1;">Financial Command Center - Market Digest</h1>
  <p style="color: #666; font-size: 14px;">Generated: ${new Date().toLocaleString()}</p>
  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${digest}</pre>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #999; font-size: 12px; text-align: center;">
    Sent from Financial Command Center
  </p>
</body>
</html>
        `
      });
      
      if (response.success) {
        alert('✅ Digest sent to your email!');
      } else {
        alert('❌ Failed to send email. Make sure Gmail is connected.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('❌ Error sending email. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // NEW: PDF Export
  const exportToPDF = () => {
    window.print();
  };

  const filteredNews = useMemo(() => {
    let filtered = news;
    
    if (selectedCatalysts.length > 0) {
      filtered = filtered.filter(article => 
        article.catalysts.some(c => selectedCatalysts.includes(c))
      );
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(query) ||
        article.description?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [news, selectedCatalysts, searchQuery]);

  const clusteredNews = useMemo(() => {
    // Simple clustering by keywords
    const clusters = {};
    
    filteredNews.forEach(article => {
      const keywords = article.title.toLowerCase().split(' ')
        .filter(w => w.length > 4)
        .slice(0, 3);
      
      const key = keywords[0] || 'general';
      if (!clusters[key]) {
        clusters[key] = [];
      }
      clusters[key].push(article);
    });
    
    return Object.entries(clusters)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);
  }, [filteredNews]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!tailwindLoaded) {
    return <div style={{ padding: '20px', textAlign: 'center', background: theme.bg, color: theme.text }}>Loading...</div>;
  }

  const currentWatchlist = watchlists.find(w => w.id === activeWatchlist);

  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", Arial, sans-serif',
      background: theme.bg,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 32px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: theme.bgCard
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            margin: 0,
            color: theme.text,
            letterSpacing: '-0.5px'
          }}>
            Financial Command Center
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '13px',
            color: theme.textSecondary
          }}>
            Real-time market intelligence • AI-powered insights
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '10px 16px',
              background: theme.bgSecondary,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              color: theme.text,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          
          {/* Generate Digest */}
          <button
            onClick={() => generateDigest('daily')}
            disabled={digestLoading}
            style={{
              padding: '10px 20px',
              background: theme.accent,
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#ffffff',
              cursor: digestLoading ? 'default' : 'pointer',
              opacity: digestLoading ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            {digestLoading ? 'Generating...' : '📊 Generate Digest'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 81px)' }}>
        {/* Sidebar */}
        <div style={{
          width: '280px',
          borderRight: `1px solid ${theme.border}`,
          background: theme.bgSecondary,
          padding: '24px',
          overflowY: 'auto'
        }}>
          {/* Navigation */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '11px',
              fontWeight: '600',
              color: theme.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              Navigation
            </h3>
            {[
              { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
              { id: 'watchlist', label: '⭐ Watchlist', icon: '⭐' },
              { id: 'portfolio', label: '💼 Portfolio', icon: '💼' },
              { id: 'alerts', label: '🔔 Alerts', badge: alerts.length },
              { id: 'social', label: '🌐 Social', icon: '🌐' },
              { id: 'sectors', label: '🏢 Sectors', icon: '🏢' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: activeView === item.id ? theme.accent : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: activeView === item.id ? '#ffffff' : theme.text,
                  cursor: 'pointer',
                  marginBottom: '6px',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span style={{
                    padding: '2px 8px',
                    background: theme.danger,
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#ffffff'
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sectors */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <h3 style={{
                fontSize: '11px',
                fontWeight: '600',
                color: theme.textTertiary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                margin: 0
              }}>
                Sectors ({SECTORS.length})
              </h3>
              {activeView === 'sectors' && (
                <button
                  onClick={() => setShowAddSector(true)}
                  style={{
                    padding: '4px 8px',
                    background: theme.accent,
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  + Add
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
              {SECTORS.slice(0, 8).map(sector => (
                <div
                  key={sector.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <button
                    onClick={() => toggleSector(sector.id)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: selectedSectors.includes(sector.id) ? theme.accent + '20' : 'transparent',
                      border: `1px solid ${selectedSectors.includes(sector.id) ? theme.accent : theme.border}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: selectedSectors.includes(sector.id) ? theme.accent : theme.text,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                  >
                    {sector.name}
                  </button>
                  {sector.custom && activeView === 'sectors' && (
                    <button
                      onClick={() => deleteCustomSector(sector.id)}
                      style={{
                        marginLeft: '4px',
                        padding: '8px',
                        background: theme.danger + '20',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: theme.danger,
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {SECTORS.length > 8 && activeView !== 'sectors' && (
              <button
                onClick={() => setActiveView('sectors')}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '6px',
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: theme.textSecondary,
                  cursor: 'pointer'
                }}
              >
                View All ({SECTORS.length})
              </button>
            )}
          </div>

          {/* Catalysts */}
          <div>
            <h3 style={{
              fontSize: '11px',
              fontWeight: '600',
              color: theme.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px'
            }}>
              Catalysts
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {CATALYSTS.map(catalyst => (
                <button
                  key={catalyst.id}
                  onClick={() => toggleCatalyst(catalyst.id)}
                  style={{
                    padding: '6px 10px',
                    background: selectedCatalysts.includes(catalyst.id) ? catalyst.color : theme.bgCard,
                    border: `1px solid ${selectedCatalysts.includes(catalyst.id) ? catalyst.color : theme.border}`,
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: selectedCatalysts.includes(catalyst.id) ? '#ffffff' : theme.textSecondary,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {catalyst.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div style={{ padding: '32px' }}>
              {/* Search */}
              <div style={{ marginBottom: '32px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search news, tickers, or topics..."
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: theme.bgCard,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: theme.text,
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = theme.accent}
                  onBlur={(e) => e.target.style.borderColor = theme.border}
                />
              </div>

              {/* Stats */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '20px',
                marginBottom: '32px'
              }}>
                {[
                  { label: 'Total Stories', value: news.length, color: theme.accent },
                  { label: 'Watchlist', value: currentWatchlist?.tickers.length || 0, color: theme.success },
                  { label: 'Alerts', value: alerts.length, color: theme.warning },
                  { label: 'Catalysts', value: selectedCatalysts.length, color: theme.danger }
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '20px',
                      background: theme.bgCard,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '12px',
                      boxShadow: darkMode ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: stat.color,
                      marginBottom: '8px'
                    }}>
                      {stat.value}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: theme.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Clustered News */}
              <div>
                <h2 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: theme.text,
                  marginBottom: '20px'
                }}>
                  Story Clusters
                </h2>
                
                {newsLoading ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px', 
                    color: theme.textTertiary 
                  }}>
                    Loading market intelligence...
                  </div>
                ) : clusteredNews.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    background: theme.bgCard,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '12px',
                    color: theme.textTertiary
                  }}>
                    No stories found. Try adjusting your filters or sectors.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {clusteredNews.map(([topic, articles], idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '24px',
                          background: theme.bgCard,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '12px',
                          boxShadow: darkMode ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.04)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '16px'
                        }}>
                          <h3 style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: theme.text,
                            textTransform: 'capitalize',
                            margin: 0
                          }}>
                            {topic} ({articles.length} stories)
                          </h3>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {[...new Set(articles.flatMap(a => a.catalysts))].slice(0, 3).map(cat => {
                              const catalyst = CATALYSTS.find(c => c.id === cat);
                              return catalyst ? (
                                <span
                                  key={cat}
                                  style={{
                                    padding: '4px 8px',
                                    background: catalyst.color,
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: '#ffffff',
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  {catalyst.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {articles.slice(0, 3).map((article, articleIdx) => (
                            <a
                              key={articleIdx}
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                gap: '16px',
                                padding: '12px',
                                background: theme.bgSecondary,
                                borderRadius: '8px',
                                textDecoration: 'none',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = darkMode ? '#2a2a2a' : '#f5f5f5';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = theme.bgSecondary;
                              }}
                            >
                              {article.urlToImage && (
                                <img
                                  src={article.urlToImage}
                                  alt=""
                                  style={{
                                    width: '80px',
                                    height: '60px',
                                    objectFit: 'cover',
                                    borderRadius: '6px',
                                    flexShrink: 0
                                  }}
                                />
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: theme.text,
                                  marginBottom: '4px',
                                  lineHeight: '1.4'
                                }}>
                                  {article.title}
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  color: theme.textTertiary,
                                  display: 'flex',
                                  gap: '8px'
                                }}>
                                  <span>{article.source.name}</span>
                                  <span>•</span>
                                  <span>{formatDate(article.publishedAt)}</span>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Watchlist View */}
          {activeView === 'watchlist' && (
            <div style={{ padding: '32px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: theme.text,
                  margin: 0
                }}>
                  My Watchlist
                </h2>
                <button
                  onClick={() => setShowAddTicker(true)}
                  style={{
                    padding: '10px 20px',
                    background: theme.accent,
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  + Add Ticker
                </button>
              </div>

              {/* Add Ticker Modal */}
              {showAddTicker && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    width: '500px',
                    maxHeight: '80vh',
                    background: theme.bgCard,
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    overflowY: 'auto'
                  }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: theme.text,
                      marginBottom: '20px'
                    }}>
                      Add Ticker to Watchlist
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                      <input
                        type="text"
                        value={tickerSearch}
                        onChange={(e) => setTickerSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchTickers()}
                        placeholder="Search by symbol or company name..."
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          background: theme.bgSecondary,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: theme.text,
                          outline: 'none'
                        }}
                        autoFocus
                      />
                      <button
                        onClick={searchTickers}
                        style={{
                          padding: '12px 24px',
                          background: theme.accent,
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        Search
                      </button>
                    </div>

                    {tickerResults.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {tickerResults.slice(0, 10).map((ticker, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px',
                              background: theme.bgSecondary,
                              borderRadius: '8px'
                            }}
                          >
                            <div>
                              <div style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: theme.text
                              }}>
                                {ticker.symbol}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: theme.textSecondary
                              }}>
                                {ticker.name}
                              </div>
                            </div>
                            <button
                              onClick={() => addToWatchlist(ticker)}
                              style={{
                                padding: '6px 14px',
                                background: theme.accent,
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#ffffff',
                                cursor: 'pointer'
                              }}
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setShowAddTicker(false);
                        setTickerSearch('');
                        setTickerResults([]);
                      }}
                      style={{
                        width: '100%',
                        marginTop: '20px',
                        padding: '12px',
                        background: theme.bgSecondary,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: theme.textSecondary,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Watchlist Tickers */}
              {currentWatchlist && currentWatchlist.tickers.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  background: theme.bgCard,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px',
                  color: theme.textTertiary
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                  <div style={{ fontSize: '16px', marginBottom: '8px', color: theme.text }}>
                    No tickers in watchlist
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Add stocks to track them and get personalized insights
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {currentWatchlist?.tickers.map((ticker, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '20px',
                        background: theme.bgCard,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '12px',
                        boxShadow: darkMode ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.04)',
                        position: 'relative'
                      }}
                    >
                      <button
                        onClick={() => removeFromWatchlist(ticker.symbol)}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '24px',
                          height: '24px',
                          border: 'none',
                          background: theme.bgSecondary,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: theme.textSecondary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                      
                      <div style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: theme.text,
                        marginBottom: '8px',
                        paddingRight: '30px'
                      }}>
                        {ticker.symbol}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: theme.textSecondary,
                        marginBottom: '16px'
                      }}>
                        {ticker.name}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: theme.textTertiary,
                        marginBottom: '16px'
                      }}>
                        {ticker.region} • {ticker.currency}
                      </div>
                      
                      <button
                        onClick={() => briefMe(ticker)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: theme.accent,
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        📋 Brief Me
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ticker Detail View */}
          {activeView === 'ticker-detail' && tickerData && (
            <div style={{ padding: '32px' }}>
              <button
                onClick={() => setActiveView('watchlist')}
                style={{
                  padding: '8px 16px',
                  background: theme.bgSecondary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: theme.text,
                  cursor: 'pointer',
                  marginBottom: '24px'
                }}
              >
                ← Back to Watchlist
              </button>

              <div style={{
                padding: '32px',
                background: theme.bgCard,
                border: `1px solid ${theme.border}`,
                borderRadius: '16px',
                boxShadow: darkMode ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.04)',
                marginBottom: '24px'
              }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: theme.text,
                  marginBottom: '8px'
                }}>
                  {tickerData.symbol}
                </div>
                <div style={{
                  fontSize: '16px',
                  color: theme.textSecondary,
                  marginBottom: '24px'
                }}>
                  {tickerData.name}
                </div>

                {briefLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: theme.textTertiary }}>
                    Generating brief...
                  </div>
                ) : (
                  <>
                    <div style={{
                      padding: '20px',
                      background: theme.bgSecondary,
                      borderRadius: '12px',
                      marginBottom: '24px'
                    }}>
                      <h3 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: theme.text,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '12px'
                      }}>
                        Executive Brief
                      </h3>
                      <div style={{
                        fontSize: '14px',
                        color: theme.textSecondary,
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {tickerData.brief}
                      </div>
                    </div>

                    {tickerData.forecast && (
                      <div style={{
                        padding: '20px',
                        background: theme.bgSecondary,
                        borderRadius: '12px'
                      }}>
                        <h3 style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: theme.text,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '12px'
                        }}>
                          Forecast Scenarios
                        </h3>
                        <div style={{
                          fontSize: '13px',
                          color: theme.textSecondary,
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {tickerData.forecast}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Related News */}
              {tickerData.news && tickerData.news.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: theme.text,
                    marginBottom: '16px'
                  }}>
                    Related News
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {tickerData.news.map((article, idx) => (
                      <a
                        key={idx}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          gap: '16px',
                          padding: '16px',
                          background: theme.bgCard,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '10px',
                          textDecoration: 'none',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {article.urlToImage && (
                          <img
                            src={article.urlToImage}
                            alt=""
                            style={{
                              width: '100px',
                              height: '70px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              flexShrink: 0
                            }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: theme.text,
                            marginBottom: '6px',
                            lineHeight: '1.4'
                          }}>
                            {article.title}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: theme.textTertiary,
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center'
                          }}>
                            <span>{article.source.name}</span>
                            <span>•</span>
                            <span>{formatDate(article.publishedAt)}</span>
                            {article.catalysts.length > 0 && (
                              <>
                                <span>•</span>
                                {article.catalysts.slice(0, 2).map(cat => {
                                  const catalyst = CATALYSTS.find(c => c.id === cat);
                                  return catalyst ? (
                                    <span
                                      key={cat}
                                      style={{
                                        padding: '2px 6px',
                                        background: catalyst.color,
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        color: '#ffffff',
                                        textTransform: 'uppercase'
                                      }}
                                    >
                                      {catalyst.name}
                                    </span>
                                  ) : null;
                                })}
                              </>
                            )}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alerts View */}
          {activeView === 'alerts' && (
            <div style={{ padding: '32px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <div>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: theme.text,
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    Alerts
                  </h2>
                  {lastCheck && (
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: theme.textTertiary
                    }}>
                      Last checked: {formatDate(lastCheck)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setAlerts([])}
                  disabled={alerts.length === 0}
                  style={{
                    padding: '10px 20px',
                    background: theme.bgSecondary,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: theme.text,
                    cursor: alerts.length === 0 ? 'default' : 'pointer',
                    opacity: alerts.length === 0 ? 0.5 : 1
                  }}
                >
                  Clear All
                </button>
              </div>

              {alerts.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  background: theme.bgCard,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px',
                  color: theme.textTertiary
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
                  <div style={{ fontSize: '16px', marginBottom: '8px', color: theme.text }}>
                    No alerts yet
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    You'll see news alerts for your watchlist tickers here
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {alerts.map((alert, idx) => (
                    <a
                      key={alert.id || idx}
                      href={alert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        background: theme.bgCard,
                        border: `1px solid ${theme.border}`,
                        borderRadius: '10px',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = darkMode ? '#2a2a2a' : '#f5f5f5';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = theme.bgCard;
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <span style={{
                            padding: '4px 8px',
                            background: theme.accent,
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#ffffff'
                          }}>
                            {alert.ticker}
                          </span>
                          {alert.catalysts && alert.catalysts.length > 0 && (
                            alert.catalysts.slice(0, 2).map(cat => {
                              const catalyst = CATALYSTS.find(c => c.id === cat);
                              return catalyst ? (
                                <span
                                  key={cat}
                                  style={{
                                    padding: '4px 8px',
                                    background: catalyst.color,
                                    borderRadius: '6px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: '#ffffff',
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  {catalyst.name}
                                </span>
                              ) : null;
                            })
                          )}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: theme.text,
                          marginBottom: '6px',
                          lineHeight: '1.4'
                        }}>
                          {alert.title}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: theme.textTertiary
                        }}>
                          {formatDate(alert.timestamp)}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Digest View */}
          {activeView === 'digest' && (
            <div style={{ padding: '32px' }}>
              <button
                onClick={() => setActiveView('dashboard')}
                style={{
                  padding: '8px 16px',
                  background: theme.bgSecondary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: theme.text,
                  cursor: 'pointer',
                  marginBottom: '24px'
                }}
              >
                ← Back to Dashboard
              </button>

              <div style={{
                padding: '32px',
                background: theme.bgCard,
                border: `1px solid ${theme.border}`,
                borderRadius: '16px',
                boxShadow: darkMode ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '24px'
                }}>
                  <div>
                    <h2 style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: theme.text,
                      marginBottom: '8px',
                      margin: 0
                    }}>
                      Daily Market Digest
                    </h2>
                    <p style={{
                      margin: '4px 0 0 0',
                      fontSize: '13px',
                      color: theme.textTertiary
                    }}>
                      Generated {new Date().toLocaleString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={emailDigest}
                      disabled={emailLoading || !digest}
                      style={{
                        padding: '10px 20px',
                        background: theme.success,
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#ffffff',
                        cursor: (emailLoading || !digest) ? 'default' : 'pointer',
                        opacity: (emailLoading || !digest) ? 0.6 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      {emailLoading ? 'Sending...' : '📧 Email'}
                    </button>
                    <button
                      onClick={exportToPDF}
                      disabled={!digest}
                      style={{
                        padding: '10px 20px',
                        background: theme.accent,
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#ffffff',
                        cursor: !digest ? 'default' : 'pointer',
                        opacity: !digest ? 0.6 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      📄 Export PDF
                    </button>
                  </div>
                </div>
                
                <div 
                  id="digest-content"
                  style={{
                    fontSize: '15px',
                    color: theme.textSecondary,
                    lineHeight: '1.8',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {digest || 'No digest generated yet. Click "Generate Digest" to create one.'}
                </div>
              </div>
            </div>
          )}

          {/* Social View - ENHANCED */}
          {activeView === 'social' && (
            <div style={{ padding: '32px' }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '24px'
              }}>
                Social Intelligence
              </h2>

              {/* Platform & Search */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  {['linkedin', 'youtube'].map(platform => (
                    <button
                      key={platform}
                      onClick={() => {
                        setSocialSearchPlatform(platform);
                        setSocialResults([]);
                      }}
                      style={{
                        padding: '10px 20px',
                        border: socialSearchPlatform === platform ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`,
                        background: socialSearchPlatform === platform ? theme.accent : theme.bgCard,
                        color: socialSearchPlatform === platform ? '#ffffff' : theme.text,
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textTransform: 'capitalize'
                      }}
                    >
                      {platform === 'linkedin' ? '💼 LinkedIn' : '📺 YouTube'}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <input
                    type="text"
                    value={socialSearchQuery}
                    onChange={(e) => setSocialSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchSocial()}
                    placeholder={socialSearchPlatform === 'linkedin' ? 'Search finance professionals...' : 'Search finance channels/videos...'}
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      background: theme.bgCard,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '10px',
                      fontSize: '14px',
                      color: theme.text,
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = theme.accent}
                    onBlur={(e) => e.target.style.borderColor = theme.border}
                  />
                  <button
                    onClick={searchSocial}
                    disabled={socialLoading}
                    style={{
                      padding: '14px 32px',
                      background: theme.accent,
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                      cursor: socialLoading ? 'default' : 'pointer',
                      opacity: socialLoading ? 0.6 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    {socialLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {/* Followed Accounts */}
              {followedAccounts.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: theme.text,
                    marginBottom: '16px'
                  }}>
                    Following ({followedAccounts.length})
                  </h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '16px' 
                  }}>
                    {followedAccounts.map((account, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '16px',
                          background: theme.bgCard,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '10px',
                          position: 'relative'
                        }}
                      >
                        <button
                          onClick={() => unfollowAccount(account)}
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            padding: '4px 8px',
                            background: theme.danger + '20',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: theme.danger,
                            cursor: 'pointer'
                          }}
                        >
                          Unfollow
                        </button>
                        
                        <div style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: theme.accent,
                          textTransform: 'uppercase',
                          marginBottom: '8px'
                        }}>
                          {account.platform === 'linkedin' ? '💼 LinkedIn' : '📺 YouTube'}
                        </div>
                        
                        <a
                          href={account.link || `https://youtube.com/watch?v=${account.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block',
                            textDecoration: 'none',
                            marginBottom: '8px'
                          }}
                        >
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: theme.text,
                            marginBottom: '4px'
                          }}>
                            {account.name || account.title || account.channelTitle}
                          </div>
                          {account.headline && (
                            <div style={{
                              fontSize: '12px',
                              color: theme.textSecondary
                            }}>
                              {account.headline}
                            </div>
                          )}
                        </a>
                        
                        <div style={{
                          fontSize: '11px',
                          color: theme.textTertiary
                        }}>
                          Followed {new Date(account.followedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {socialResults.length > 0 && (
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: theme.text,
                    marginBottom: '16px'
                  }}>
                    Search Results ({socialResults.length})
                  </h3>
                  
                  {socialSearchPlatform === 'linkedin' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {socialResults.map((profile, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '16px',
                            background: theme.bgCard,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '10px'
                          }}
                        >
                          <a
                            href={profile.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1,
                              textDecoration: 'none'
                            }}
                          >
                            <div style={{
                              fontSize: '15px',
                              fontWeight: '600',
                              color: theme.text,
                              marginBottom: '4px'
                            }}>
                              {profile.name}
                            </div>
                            <div style={{
                              fontSize: '13px',
                              color: theme.textSecondary,
                              marginBottom: '4px'
                            }}>
                              {profile.headline}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: theme.textTertiary
                            }}>
                              {profile.location}
                            </div>
                          </a>
                          <button
                            onClick={() => followAccount(profile)}
                            style={{
                              padding: '8px 16px',
                              background: theme.accent,
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#ffffff',
                              cursor: 'pointer',
                              marginLeft: '16px'
                            }}
                          >
                            Follow
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                      gap: '16px' 
                    }}>
                      {socialResults.map((video, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: theme.bgCard,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '10px',
                            overflow: 'hidden',
                            position: 'relative'
                          }}
                        >
                          <a
                            href={`https://youtube.com/watch?v=${video.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', textDecoration: 'none' }}
                          >
                            {video.thumbnail && (
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                style={{
                                  width: '100%',
                                  height: '180px',
                                  objectFit: 'cover'
                                }}
                              />
                            )}
                            <div style={{ padding: '12px' }}>
                              <div style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: theme.text,
                                marginBottom: '6px',
                                lineHeight: '1.4',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {video.title}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: theme.textSecondary,
                                marginBottom: '6px'
                              }}>
                                {video.channelTitle}
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: theme.textTertiary
                              }}>
                                {video.publishedAt && new Date(video.publishedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </a>
                          <button
                            onClick={() => followAccount(video)}
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              padding: '6px 12px',
                              background: 'rgba(0, 0, 0, 0.7)',
                              backdropFilter: 'blur(4px)',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: '#ffffff',
                              cursor: 'pointer'
                            }}
                          >
                            Follow
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {socialResults.length === 0 && !socialLoading && (
                <div style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  background: theme.bgCard,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px',
                  color: theme.textTertiary
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                  <div style={{ fontSize: '16px', marginBottom: '8px', color: theme.text }}>
                    Search for finance influencers
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Find and follow finance professionals on LinkedIn and YouTube
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Portfolio View - NEW */}
          {activeView === 'portfolio' && (
            <div style={{ padding: '32px' }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '24px'
              }}>
                Portfolio Tracking
              </h2>

              {currentWatchlist && currentWatchlist.tickers.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  background: theme.bgCard,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '12px',
                  color: theme.textTertiary
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
                  <div style={{ fontSize: '16px', marginBottom: '8px', color: theme.text }}>
                    No positions yet
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Add tickers to your watchlist to start tracking positions
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {currentWatchlist?.tickers.map((ticker, idx) => {
                    const position = positions[ticker.symbol] || {};
                    const hasPosition = position.quantity && position.entryPrice;
                    const costBasis = hasPosition ? position.quantity * position.entryPrice : 0;
                    const currentValue = hasPosition && position.currentPrice ? position.quantity * position.currentPrice : 0;
                    const pnl = currentValue - costBasis;
                    const pnlPercent = costBasis > 0 ? ((pnl / costBasis) * 100) : 0;
                    
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '24px',
                          background: theme.bgCard,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '12px',
                          boxShadow: darkMode ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.04)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <div>
                            <div style={{
                              fontSize: '24px',
                              fontWeight: '700',
                              color: theme.text,
                              marginBottom: '4px'
                            }}>
                              {ticker.symbol}
                            </div>
                            <div style={{
                              fontSize: '13px',
                              color: theme.textSecondary
                            }}>
                              {ticker.name}
                            </div>
                          </div>
                          {hasPosition && pnl !== 0 && (
                            <div style={{ textAlign: 'right' }}>
                              <div style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: pnl >= 0 ? theme.success : theme.danger
                              }}>
                                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} {ticker.currency}
                              </div>
                              <div style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: pnl >= 0 ? theme.success : theme.danger
                              }}>
                                {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                              </div>
                            </div>
                          )}
                        </div>

                        {editingPosition === ticker.symbol ? (
                          <div style={{
                            padding: '16px',
                            background: theme.bgSecondary,
                            borderRadius: '8px'
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                              <div>
                                <label style={{
                                  display: 'block',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: theme.textSecondary,
                                  marginBottom: '6px',
                                  textTransform: 'uppercase'
                                }}>
                                  Quantity
                                </label>
                                <input
                                  type="number"
                                  defaultValue={position.quantity || ''}
                                  placeholder="0"
                                  id={`quantity-${ticker.symbol}`}
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: theme.bgCard,
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    color: theme.text,
                                    outline: 'none'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{
                                  display: 'block',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: theme.textSecondary,
                                  marginBottom: '6px',
                                  textTransform: 'uppercase'
                                }}>
                                  Entry Price
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={position.entryPrice || ''}
                                  placeholder="0.00"
                                  id={`entry-${ticker.symbol}`}
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: theme.bgCard,
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    color: theme.text,
                                    outline: 'none'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{
                                  display: 'block',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: theme.textSecondary,
                                  marginBottom: '6px',
                                  textTransform: 'uppercase'
                                }}>
                                  Current Price
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={position.currentPrice || ''}
                                  placeholder="0.00"
                                  id={`current-${ticker.symbol}`}
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: theme.bgCard,
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    color: theme.text,
                                    outline: 'none'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{
                                  display: 'block',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: theme.textSecondary,
                                  marginBottom: '6px',
                                  textTransform: 'uppercase'
                                }}>
                                  Target Price
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  defaultValue={position.targetPrice || ''}
                                  placeholder="0.00"
                                  id={`target-${ticker.symbol}`}
                                  style={{
                                    width: '100%',
                                    padding: '10px',
                                    background: theme.bgCard,
                                    border: `1px solid ${theme.border}`,
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    color: theme.text,
                                    outline: 'none'
                                  }}
                                />
                              </div>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                              <label style={{
                                display: 'block',
                                fontSize: '11px',
                                fontWeight: '600',
                                color: theme.textSecondary,
                                marginBottom: '6px',
                                textTransform: 'uppercase'
                              }}>
                                Notes
                              </label>
                              <textarea
                                defaultValue={tickerNotes[ticker.symbol] || ''}
                                placeholder="Add notes about this position..."
                                id={`notes-${ticker.symbol}`}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  background: theme.bgCard,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  color: theme.text,
                                  fontFamily: 'inherit',
                                  resize: 'vertical',
                                  minHeight: '60px',
                                  outline: 'none'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => {
                                  const quantity = parseFloat(document.getElementById(`quantity-${ticker.symbol}`).value);
                                  const entryPrice = parseFloat(document.getElementById(`entry-${ticker.symbol}`).value);
                                  const currentPrice = parseFloat(document.getElementById(`current-${ticker.symbol}`).value);
                                  const targetPrice = parseFloat(document.getElementById(`target-${ticker.symbol}`).value);
                                  const notes = document.getElementById(`notes-${ticker.symbol}`).value;
                                  
                                  updatePosition(ticker.symbol, {
                                    quantity: quantity || null,
                                    entryPrice: entryPrice || null,
                                    currentPrice: currentPrice || null,
                                    targetPrice: targetPrice || null
                                  });
                                  
                                  if (notes) {
                                    setTickerNotes(prev => ({
                                      ...prev,
                                      [ticker.symbol]: notes
                                    }));
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  padding: '10px',
                                  background: theme.accent,
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: '#ffffff',
                                  cursor: 'pointer'
                                }}
                              >
                                Save Position
                              </button>
                              <button
                                onClick={() => setEditingPosition(null)}
                                style={{
                                  padding: '10px 20px',
                                  background: theme.bgCard,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: theme.textSecondary,
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {hasPosition ? (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '16px',
                                marginBottom: '16px'
                              }}>
                                <div>
                                  <div style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: theme.textTertiary,
                                    marginBottom: '4px',
                                    textTransform: 'uppercase'
                                  }}>
                                    Shares
                                  </div>
                                  <div style={{
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: theme.text
                                  }}>
                                    {position.quantity}
                                  </div>
                                </div>
                                <div>
                                  <div style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: theme.textTertiary,
                                    marginBottom: '4px',
                                    textTransform: 'uppercase'
                                  }}>
                                    Entry
                                  </div>
                                  <div style={{
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: theme.text
                                  }}>
                                    {position.entryPrice?.toFixed(2)}
                                  </div>
                                </div>
                                <div>
                                  <div style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: theme.textTertiary,
                                    marginBottom: '4px',
                                    textTransform: 'uppercase'
                                  }}>
                                    Current
                                  </div>
                                  <div style={{
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: theme.text
                                  }}>
                                    {position.currentPrice ? position.currentPrice.toFixed(2) : '-'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: theme.textTertiary,
                                    marginBottom: '4px',
                                    textTransform: 'uppercase'
                                  }}>
                                    Target
                                  </div>
                                  <div style={{
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: theme.text
                                  }}>
                                    {position.targetPrice ? position.targetPrice.toFixed(2) : '-'}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{
                                padding: '20px',
                                background: theme.bgSecondary,
                                borderRadius: '8px',
                                textAlign: 'center',
                                color: theme.textTertiary,
                                marginBottom: '16px'
                              }}>
                                No position data yet. Click "Edit Position" to add details.
                              </div>
                            )}
                            
                            {tickerNotes[ticker.symbol] && (
                              <div style={{
                                padding: '12px',
                                background: theme.bgSecondary,
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: theme.textSecondary,
                                marginBottom: '16px',
                                lineHeight: '1.5'
                              }}>
                                {tickerNotes[ticker.symbol]}
                              </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setEditingPosition(ticker.symbol)}
                                style={{
                                  flex: 1,
                                  padding: '10px',
                                  background: theme.accent,
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: '#ffffff',
                                  cursor: 'pointer'
                                }}
                              >
                                Edit Position
                              </button>
                              <button
                                onClick={() => briefMe(ticker)}
                                style={{
                                  padding: '10px 20px',
                                  background: theme.bgSecondary,
                                  border: `1px solid ${theme.border}`,
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: theme.text,
                                  cursor: 'pointer'
                                }}
                              >
                                📋 Brief
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sectors View - NEW */}
          {activeView === 'sectors' && (
            <div style={{ padding: '32px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: theme.text,
                  margin: 0
                }}>
                  Sector Management
                </h2>
                <button
                  onClick={() => setShowAddSector(true)}
                  style={{
                    padding: '10px 20px',
                    background: theme.accent,
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  + Add Custom Sector
                </button>
              </div>

              {/* Add Sector Modal */}
              {showAddSector && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    width: '500px',
                    background: theme.bgCard,
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                  }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: theme.text,
                      marginBottom: '20px'
                    }}>
                      Add Custom Sector
                    </h3>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: theme.textSecondary,
                        marginBottom: '8px',
                        textTransform: 'uppercase'
                      }}>
                        Sector Name
                      </label>
                      <input
                        type="text"
                        value={newSectorName}
                        onChange={(e) => setNewSectorName(e.target.value)}
                        placeholder="e.g., Artificial Intelligence"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: theme.bgSecondary,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: theme.text,
                          outline: 'none'
                        }}
                        autoFocus
                      />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: theme.textSecondary,
                        marginBottom: '8px',
                        textTransform: 'uppercase'
                      }}>
                        Keywords (space-separated)
                      </label>
                      <textarea
                        value={newSectorKeywords}
                        onChange={(e) => setNewSectorKeywords(e.target.value)}
                        placeholder="e.g., AI machine learning neural network GPT LLM"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: theme.bgSecondary,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          color: theme.text,
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          minHeight: '80px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={addCustomSector}
                        disabled={!newSectorName.trim() || !newSectorKeywords.trim()}
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: theme.accent,
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#ffffff',
                          cursor: (!newSectorName.trim() || !newSectorKeywords.trim()) ? 'default' : 'pointer',
                          opacity: (!newSectorName.trim() || !newSectorKeywords.trim()) ? 0.5 : 1
                        }}
                      >
                        Add Sector
                      </button>
                      <button
                        onClick={() => {
                          setShowAddSector(false);
                          setNewSectorName('');
                          setNewSectorKeywords('');
                        }}
                        style={{
                          padding: '12px 24px',
                          background: theme.bgSecondary,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: theme.textSecondary,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Sectors List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {SECTORS.map(sector => (
                  <div
                    key={sector.id}
                    style={{
                      padding: '20px',
                      background: theme.bgCard,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '12px',
                      boxShadow: darkMode ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: theme.text,
                            margin: 0
                          }}>
                            {sector.name}
                          </h3>
                          {sector.custom && (
                            <span style={{
                              padding: '4px 8px',
                              background: theme.accent + '20',
                              color: theme.accent,
                              borderRadius: '6px',
                              fontSize: '10px',
                              fontWeight: '700',
                              textTransform: 'uppercase'
                            }}>
                              Custom
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: theme.textSecondary,
                          marginBottom: '12px'
                        }}>
                          <strong>Keywords:</strong> {sector.keywords}
                        </div>
                        <button
                          onClick={() => toggleSector(sector.id)}
                          style={{
                            padding: '8px 16px',
                            background: selectedSectors.includes(sector.id) ? theme.success : theme.bgSecondary,
                            border: `1px solid ${selectedSectors.includes(sector.id) ? theme.success : theme.border}`,
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: selectedSectors.includes(sector.id) ? '#ffffff' : theme.text,
                            cursor: 'pointer'
                          }}
                        >
                          {selectedSectors.includes(sector.id) ? '✓ Active' : 'Activate'}
                        </button>
                      </div>
                      {sector.custom && (
                        <button
                          onClick={() => deleteCustomSector(sector.id)}
                          style={{
                            padding: '8px 16px',
                            background: theme.danger + '20',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: theme.danger,
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FinancialCommandCenter;
