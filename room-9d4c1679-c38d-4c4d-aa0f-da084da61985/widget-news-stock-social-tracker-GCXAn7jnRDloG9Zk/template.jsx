import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

function NewsStockSocialTracker() {
  const [tailwindLoaded, setTailwindLoaded] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('news');
  
  // News state
  const [newsCategory, setNewsCategory] = useState('general');
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [newsArticles, setNewsArticles] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  // Stock state
  const [stockSearch, setStockSearch] = useState('');
  const [trackedSymbols, setTrackedSymbols] = useStorage('tracked-symbols', []);
  const [stockResults, setStockResults] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockNotes, setStockNotes] = useStorage('stock-notes', {});
  const [editingNote, setEditingNote] = useState(null);
  
  // Social state
  const [socialPlatform, setSocialPlatform] = useState('linkedin');
  const [linkedinSearch, setLinkedinSearch] = useState('');
  const [linkedinProfiles, setLinkedinProfiles] = useState([]);
  const [youtubeSearch, setYoutubeSearch] = useState('');
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [socialLoading, setSocialLoading] = useState(false);

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
    
    // Apply white background for scrollable content
    document.body.style.background = '#ffffff';
    document.documentElement.style.minHeight = '100%';
    return () => {
      document.body.style.background = '';
      document.documentElement.style.minHeight = '';
    };
  }, []);

  // Fetch news on category change or search
  useEffect(() => {
    if (tailwindLoaded && activeTab === 'news') {
      if (newsSearchQuery.trim()) {
        searchNews();
      } else {
        fetchNews();
      }
    }
  }, [newsCategory, tailwindLoaded, activeTab]);

  const fetchNews = async () => {
    setNewsLoading(true);
    setSelectedArticle(null);
    setAiSummary('');
    try {
      const response = await miyagiAPI.post('/news-top-headlines', {
        category: newsCategory,
        pageSize: 15
      });
      if (response.success) {
        setNewsArticles(response.data.articles || []);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  const searchNews = async () => {
    if (!newsSearchQuery.trim()) {
      fetchNews();
      return;
    }
    
    setNewsLoading(true);
    setSelectedArticle(null);
    setAiSummary('');
    try {
      const response = await miyagiAPI.post('/news-search', {
        q: newsSearchQuery,
        pageSize: 15,
        sortBy: 'publishedAt'
      });
      if (response.success) {
        setNewsArticles(response.data.articles || []);
      }
    } catch (error) {
      console.error('Error searching news:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  const generateSummary = async (article) => {
    setSelectedArticle(article);
    setSummaryLoading(true);
    setAiSummary('');
    
    try {
      const prompt = `Summarize this news article in 3-4 bullet points, focusing on key facts and implications:\n\nTitle: ${article.title}\n\nContent: ${article.description || article.content || 'No content available'}`;
      
      const response = await miyagiAPI.post('/generate-text', {
        prompt: prompt,
        provider: 'openai',
        model: 'gpt-4o-mini',
        max_tokens: 200
      });
      
      if (response.success) {
        setAiSummary(response.data.text);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      setAiSummary('Failed to generate summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const searchStocks = async () => {
    if (!stockSearch.trim()) return;
    
    setStockLoading(true);
    try {
      const response = await miyagiAPI.post('/search-stocks', {
        term: stockSearch
      });
      if (response.success) {
        setStockResults(response.data.symbols || []);
      }
    } catch (error) {
      console.error('Error searching stocks:', error);
    } finally {
      setStockLoading(false);
    }
  };

  const addSymbol = (symbol) => {
    if (!trackedSymbols.find(s => s.symbol === symbol.symbol)) {
      setTrackedSymbols(prev => [...prev, symbol]);
    }
  };

  const removeSymbol = (symbolToRemove) => {
    setTrackedSymbols(prev => prev.filter(s => s.symbol !== symbolToRemove));
  };

  const searchLinkedIn = async () => {
    if (!linkedinSearch.trim()) return;
    
    setSocialLoading(true);
    try {
      const response = await miyagiAPI.post('/linkedin-search-profiles', {
        name: linkedinSearch
      });
      if (response.success) {
        setLinkedinProfiles(response.data.profiles || []);
      }
    } catch (error) {
      console.error('Error searching LinkedIn:', error);
    } finally {
      setSocialLoading(false);
    }
  };

  const searchYouTube = async () => {
    if (!youtubeSearch.trim()) return;
    
    setSocialLoading(true);
    try {
      const response = await miyagiAPI.post('/youtube-search', {
        query: youtubeSearch,
        maxResults: 10
      });
      if (response.success) {
        setYoutubeVideos(response.data.videos || []);
      }
    } catch (error) {
      console.error('Error searching YouTube:', error);
    } finally {
      setSocialLoading(false);
    }
  };

  const saveStockNote = (symbol, note) => {
    setStockNotes(prev => ({
      ...prev,
      [symbol]: note
    }));
    setEditingNote(null);
  };

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
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Helvetica Neue", Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ 
        padding: '32px 40px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '600',
          margin: 0,
          color: '#000000',
          letterSpacing: '-0.5px'
        }}>
          News + Stock + Social Tracker
        </h1>
        <p style={{
          margin: '8px 0 0 0',
          fontSize: '14px',
          color: '#666666',
          fontWeight: '400'
        }}>
          Track news, markets, and social profiles in one place
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        padding: '0 40px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        gap: '32px'
      }}>
        {['news', 'stocks', 'social'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '16px 0',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: activeTab === tab ? '600' : '400',
              color: activeTab === tab ? '#000000' : '#666666',
              cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
              transition: 'all 0.2s',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '40px' }}>
        {/* News Tab */}
        {activeTab === 'news' && (
          <div>
            {/* Search Bar */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#000000',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Search News
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={newsSearchQuery}
                  onChange={(e) => setNewsSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchNews()}
                  placeholder="Search for specific topics, companies, or keywords..."
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#f0f0f0'}
                />
                <button
                  onClick={searchNews}
                  style={{
                    padding: '14px 24px',
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Search
                </button>
                {newsSearchQuery && (
                  <button
                    onClick={() => {
                      setNewsSearchQuery('');
                      fetchNews();
                    }}
                    style={{
                      padding: '14px 20px',
                      background: '#f0f0f0',
                      color: '#666666',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter */}
            {!newsSearchQuery && (
              <div style={{ marginBottom: '32px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#000000',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Category
                </label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {['general', 'business', 'technology', 'sports', 'entertainment', 'health', 'science'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewsCategory(cat)}
                      style={{
                        padding: '10px 20px',
                        border: newsCategory === cat ? '1px solid #6366f1' : '1px solid #f0f0f0',
                        background: newsCategory === cat ? '#6366f1' : '#ffffff',
                        color: newsCategory === cat ? '#ffffff' : '#666666',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textTransform: 'capitalize'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* News Articles */}
            {newsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#999999' }}>
                Loading news...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {newsArticles.map((article, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '24px',
                      background: '#ffffff',
                      border: selectedArticle === article ? '1px solid #6366f1' : '1px solid #f0f0f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
                      {article.urlToImage && (
                        <img 
                          src={article.urlToImage} 
                          alt=""
                          style={{
                            width: '120px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block',
                            textDecoration: 'none',
                            marginBottom: '8px'
                          }}
                        >
                          <h3 style={{
                            margin: '0 0 8px 0',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#000000',
                            lineHeight: '1.4'
                          }}>
                            {article.title}
                          </h3>
                        </a>
                        <p style={{
                          margin: '0 0 12px 0',
                          fontSize: '14px',
                          color: '#666666',
                          lineHeight: '1.5'
                        }}>
                          {article.description}
                        </p>
                        <div style={{
                          display: 'flex',
                          gap: '16px',
                          fontSize: '12px',
                          color: '#999999',
                          alignItems: 'center'
                        }}>
                          <span>{article.source.name}</span>
                          <span>•</span>
                          <span>{formatDate(article.publishedAt)}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              generateSummary(article);
                            }}
                            style={{
                              marginLeft: 'auto',
                              padding: '6px 14px',
                              background: selectedArticle === article ? '#6366f1' : '#f0f0f0',
                              color: selectedArticle === article ? '#ffffff' : '#666666',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {selectedArticle === article ? '✓ AI Summary' : '✨ AI Summary'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* AI Summary Section */}
                    {selectedArticle === article && (
                      <div style={{
                        padding: '20px',
                        background: '#f8f9ff',
                        borderRadius: '8px',
                        border: '1px solid #e0e7ff'
                      }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: '#6366f1',
                          marginBottom: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          AI-Generated Summary
                        </div>
                        {summaryLoading ? (
                          <div style={{ color: '#666666', fontSize: '14px' }}>
                            Generating summary...
                          </div>
                        ) : aiSummary ? (
                          <div style={{
                            fontSize: '14px',
                            color: '#333333',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {aiSummary}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stocks Tab */}
        {activeTab === 'stocks' && (
          <div>
            {/* Search */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#000000',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Search Stocks
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchStocks()}
                  placeholder="Search by company name or symbol..."
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#f0f0f0'}
                />
                <button
                  onClick={searchStocks}
                  disabled={stockLoading}
                  style={{
                    padding: '14px 32px',
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: stockLoading ? 'default' : 'pointer',
                    opacity: stockLoading ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  {stockLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {stockResults.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <h3 style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#000000',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Search Results
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stockResults.slice(0, 5).map((symbol, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 20px',
                        background: '#ffffff',
                        border: '1px solid #f0f0f0',
                        borderRadius: '10px'
                      }}
                    >
                      <div>
                        <div style={{ 
                          fontSize: '15px', 
                          fontWeight: '600',
                          color: '#000000',
                          marginBottom: '4px'
                        }}>
                          {symbol.symbol}
                        </div>
                        <div style={{ 
                          fontSize: '13px', 
                          color: '#666666'
                        }}>
                          {symbol.name}
                        </div>
                      </div>
                      <button
                        onClick={() => addSymbol(symbol)}
                        style={{
                          padding: '8px 16px',
                          background: '#6366f1',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Track
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tracked Symbols */}
            <div>
              <h3 style={{
                fontSize: '13px',
                fontWeight: '500',
                color: '#000000',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Tracked Symbols ({trackedSymbols.length})
              </h3>
              {trackedSymbols.length === 0 ? (
                <div style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  color: '#999999',
                  border: '1px solid #f0f0f0',
                  borderRadius: '12px',
                  background: '#fafafa'
                }}>
                  No symbols tracked yet. Search and add stocks to track them.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {trackedSymbols.map((symbol, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '20px',
                        background: '#ffffff',
                        border: '1px solid #f0f0f0',
                        borderRadius: '12px',
                        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                        position: 'relative'
                      }}
                    >
                      <button
                        onClick={() => removeSymbol(symbol.symbol)}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '24px',
                          height: '24px',
                          border: 'none',
                          background: '#f0f0f0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#666666',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#000000',
                        marginBottom: '8px',
                        paddingRight: '30px'
                      }}>
                        {symbol.symbol}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#666666',
                        marginBottom: '8px'
                      }}>
                        {symbol.name}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#999999',
                        marginBottom: '16px'
                      }}>
                        {symbol.region} • {symbol.currency}
                      </div>
                      
                      {/* Notes Section */}
                      {editingNote === symbol.symbol ? (
                        <div>
                          <textarea
                            defaultValue={stockNotes[symbol.symbol] || ''}
                            placeholder="Add notes about this stock..."
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #e0e7ff',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontFamily: 'inherit',
                              resize: 'vertical',
                              minHeight: '60px',
                              outline: 'none',
                              marginBottom: '8px'
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.metaKey) {
                                saveStockNote(symbol.symbol, e.target.value);
                              }
                              if (e.key === 'Escape') {
                                setEditingNote(null);
                              }
                            }}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => {
                                const textarea = e.target.parentElement.previousElementSibling;
                                saveStockNote(symbol.symbol, textarea.value);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#6366f1',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                flex: 1
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingNote(null)}
                              style={{
                                padding: '6px 12px',
                                background: '#f0f0f0',
                                color: '#666666',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {stockNotes[symbol.symbol] ? (
                            <div
                              onClick={() => setEditingNote(symbol.symbol)}
                              style={{
                                padding: '10px',
                                background: '#f8f9ff',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#333333',
                                lineHeight: '1.5',
                                cursor: 'pointer',
                                marginBottom: '8px',
                                border: '1px solid #e0e7ff'
                              }}
                            >
                              {stockNotes[symbol.symbol]}
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingNote(symbol.symbol)}
                              style={{
                                width: '100%',
                                padding: '8px',
                                background: '#fafafa',
                                color: '#999999',
                                border: '1px dashed #e0e0e0',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              + Add Notes
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Social Tab */}
        {activeTab === 'social' && (
          <div>
            {/* Platform Selector */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ 
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: '#000000',
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Platform
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['linkedin', 'tiktok', 'youtube'].map(platform => (
                  <button
                    key={platform}
                    onClick={() => setSocialPlatform(platform)}
                    style={{
                      padding: '10px 20px',
                      border: socialPlatform === platform ? '1px solid #6366f1' : '1px solid #f0f0f0',
                      background: socialPlatform === platform ? '#6366f1' : '#ffffff',
                      color: socialPlatform === platform ? '#ffffff' : '#666666',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textTransform: 'capitalize'
                    }}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            {/* LinkedIn Search */}
            {socialPlatform === 'linkedin' && (
              <div>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#000000',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Search LinkedIn Profiles
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      value={linkedinSearch}
                      onChange={(e) => setLinkedinSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchLinkedIn()}
                      placeholder="Search by name..."
                      style={{
                        flex: 1,
                        padding: '14px 20px',
                        border: '1px solid #f0f0f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                      onBlur={(e) => e.target.style.borderColor = '#f0f0f0'}
                    />
                    <button
                      onClick={searchLinkedIn}
                      disabled={socialLoading}
                      style={{
                        padding: '14px 32px',
                        background: '#6366f1',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: socialLoading ? 'default' : 'pointer',
                        opacity: socialLoading ? 0.6 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      {socialLoading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {/* LinkedIn Results */}
                {linkedinProfiles.length > 0 && (
                  <div>
                    <h3 style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#000000',
                      marginBottom: '16px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Search Results ({linkedinProfiles.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {linkedinProfiles.map((profile, idx) => (
                        <a
                          key={idx}
                          href={profile.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block',
                            padding: '20px',
                            background: '#ffffff',
                            border: '1px solid #f0f0f0',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.04)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#000000',
                            marginBottom: '6px'
                          }}>
                            {profile.name}
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: '#666666',
                            marginBottom: '6px'
                          }}>
                            {profile.headline}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#999999'
                          }}>
                            {profile.location}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* YouTube Search */}
            {socialPlatform === 'youtube' && (
              <div>
                <div style={{ marginBottom: '32px' }}>
                  <label style={{ 
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#000000',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Search YouTube Videos
                  </label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      value={youtubeSearch}
                      onChange={(e) => setYoutubeSearch(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchYouTube()}
                      placeholder="Search for videos, channels, or topics..."
                      style={{
                        flex: 1,
                        padding: '14px 20px',
                        border: '1px solid #f0f0f0',
                        borderRadius: '10px',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                      onBlur={(e) => e.target.style.borderColor = '#f0f0f0'}
                    />
                    <button
                      onClick={searchYouTube}
                      disabled={socialLoading}
                      style={{
                        padding: '14px 32px',
                        background: '#6366f1',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: socialLoading ? 'default' : 'pointer',
                        opacity: socialLoading ? 0.6 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      {socialLoading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {/* YouTube Results */}
                {youtubeVideos.length > 0 && (
                  <div>
                    <h3 style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#000000',
                      marginBottom: '16px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Search Results ({youtubeVideos.length})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                      {youtubeVideos.map((video, idx) => (
                        <a
                          key={idx}
                          href={`https://www.youtube.com/watch?v=${video.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block',
                            background: '#ffffff',
                            border: '1px solid #f0f0f0',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            textDecoration: 'none',
                            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.04)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
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
                          <div style={{ padding: '16px' }}>
                            <h4 style={{
                              margin: '0 0 8px 0',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#000000',
                              lineHeight: '1.4',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {video.title}
                            </h4>
                            <div style={{
                              fontSize: '12px',
                              color: '#666666',
                              marginBottom: '8px'
                            }}>
                              {video.channelTitle}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: '#999999'
                            }}>
                              {video.publishedAt && new Date(video.publishedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TikTok Placeholder */}
            {socialPlatform === 'tiktok' && (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: '#999999',
                border: '1px solid #f0f0f0',
                borderRadius: '12px',
                background: '#fafafa'
              }}>
                TikTok integration: View profile info and scheduled posts
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NewsStockSocialTracker;
