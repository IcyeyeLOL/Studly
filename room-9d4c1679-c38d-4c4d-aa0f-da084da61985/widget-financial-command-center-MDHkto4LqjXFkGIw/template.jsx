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
  const [editingPosition, setEditingPosition] = useState(null);
  const [newTickerInput, setNewTickerInput] = useState('');
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorKeywords, setNewSectorKeywords] = useState('');
  const [positionForm, setPositionForm] = useState({ ticker: '', quantity: '', entryPrice: '' });

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

  const addPosition = () => {
    if (!positionForm.ticker || !positionForm.quantity || !positionForm.entryPrice) return;
    
    const ticker = positionForm.ticker.toUpperCase();
    setPositions(prev => ({
      ...(prev || {}),
      [ticker]: {
        quantity: parseFloat(positionForm.quantity),
        entryPrice: parseFloat(positionForm.entryPrice),
        currentPrice: parseFloat(positionForm.entryPrice),
        notes: '',
      },
    }));
    setPositionForm({ ticker: '', quantity: '', entryPrice: '' });
  };

  const deletePosition = (ticker) => {
    setPositions(prev => {
      const newPositions = { ...(prev || {}) };
      delete newPositions[ticker];
      return newPositions;
    });
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
            
            <div style={styles.card}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Add Ticker</div>
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

            {watchlist.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
                No tickers in watchlist. Add some above!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {watchlist.map(ticker => (
                  <div key={ticker} style={styles.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ fontSize: '24px', fontWeight: '600' }}>{ticker}</div>
                      <button
                        onClick={() => setWatchlist(prev => prev.filter(t => t !== ticker))}
                        style={{ ...styles.button('danger'), padding: '6px 12px', fontSize: '13px' }}
                      >
                        Remove
                      </button>
                    </div>
                    <button
                      onClick={() => briefTicker(ticker)}
                      disabled={loading}
                      style={{ ...styles.button('primary'), width: '100%' }}
                    >
                      {loading && selectedTicker === ticker ? 'Loading...' : '✨ Brief Me'}
                    </button>
                  </div>
                ))}
              </div>
            )}
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

        {/* Portfolio View */}
        {activeView === 'portfolio' && (
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '32px', letterSpacing: '-0.02em' }}>Portfolio</h2>
            
            <div style={styles.card}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Add Position</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Ticker"
                  value={positionForm.ticker}
                  onChange={(e) => setPositionForm({ ...positionForm, ticker: e.target.value.toUpperCase() })}
                  style={styles.input}
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={positionForm.quantity}
                  onChange={(e) => setPositionForm({ ...positionForm, quantity: e.target.value })}
                  style={styles.input}
                />
                <input
                  type="number"
                  placeholder="Entry Price"
                  value={positionForm.entryPrice}
                  onChange={(e) => setPositionForm({ ...positionForm, entryPrice: e.target.value })}
                  style={styles.input}
                />
                <button onClick={addPosition} style={styles.button('primary')}>Add</button>
              </div>
            </div>

            {Object.keys(positions).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#999' }}>
                No positions. Add some above!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {Object.entries(positions).map(([ticker, position]) => {
                  const pnl = (position.currentPrice - position.entryPrice) * position.quantity;
                  const pnlPercent = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
                  return (
                    <div key={ticker} style={styles.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ fontSize: '24px', fontWeight: '600' }}>{ticker}</div>
                        <button
                          onClick={() => deletePosition(ticker)}
                          style={{ ...styles.button('danger'), padding: '6px 12px', fontSize: '13px' }}
                        >
                          Remove
                        </button>
                      </div>
                      <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                        <div>Quantity: <strong>{position.quantity}</strong></div>
                        <div>Entry: <strong>${position.entryPrice.toFixed(2)}</strong></div>
                        <div>Current: <strong>${position.currentPrice.toFixed(2)}</strong></div>
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                          P&L: <strong style={{ color: pnl >= 0 ? '#10b981' : '#ef4444' }}>
                            ${pnl.toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                          </strong>
                        </div>
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
