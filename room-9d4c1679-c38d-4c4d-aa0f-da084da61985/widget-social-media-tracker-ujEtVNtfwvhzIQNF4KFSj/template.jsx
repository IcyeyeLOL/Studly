import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

function SocialMediaTracker() {
  const [tailwindLoaded, setTailwindLoaded] = useState(false);
  
  // Storage: posts array with { id, platform, content, postDetails, likes, comments, shares, views, followers, date, predicted?, actualVsPredicted? }
  const [posts, setPosts] = useStorage('social-posts', [], { scope: 'user' });
  const [insights, setInsights] = useStorage('social-insights', null, { scope: 'user' });
  const [trackedOptimizations, setTrackedOptimizations] = useStorage('tracked-optimizations', [], { scope: 'user' });
  
  // UI state
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'insights' | 'lab'
  const [showAddForm, setShowAddForm] = useState(false);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [labPlatformDropdownOpen, setLabPlatformDropdownOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  
  // Post Lab state
  const [labData, setLabData] = useState({
    platform: 'Instagram',
    contentIdea: '',
    hook: '',
    format: '',
    pacing: '',
    visuals: '',
    caption: ''
  });
  const [optimization, setOptimization] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    platform: 'Instagram',
    content: '',
    postDetails: '',
    likes: '',
    comments: '',
    shares: '',
    views: '',
    followers: '',
    date: new Date().toISOString().split('T')[0],
    linkedPredictionId: null
  });
  const [showPredictionLink, setShowPredictionLink] = useState(false);

  const platformDropdownRef = useRef(null);
  const labPlatformDropdownRef = useRef(null);

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
  }, []);

  useEffect(() => {
    document.body.style.background = '#ffffff';
    document.documentElement.style.minHeight = '100%';
    return () => { 
      document.body.style.background = ''; 
      document.documentElement.style.minHeight = ''; 
    };
  }, []);

  // Click outside handler for platform dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(e.target)) {
        setPlatformDropdownOpen(false);
      }
      if (labPlatformDropdownRef.current && !labPlatformDropdownRef.current.contains(e.target)) {
        setLabPlatformDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddPost = () => {
    if (!formData.content.trim()) return;
    
    // Find linked prediction if exists
    const linkedPrediction = formData.linkedPredictionId 
      ? trackedOptimizations.find(t => t.id === formData.linkedPredictionId)
      : null;
    
    const newPost = {
      id: Date.now().toString(),
      platform: formData.platform,
      content: formData.content.trim(),
      postDetails: formData.postDetails.trim(),
      likes: parseInt(formData.likes) || 0,
      comments: parseInt(formData.comments) || 0,
      shares: parseInt(formData.shares) || 0,
      views: parseInt(formData.views) || 0,
      followers: parseInt(formData.followers) || 0,
      date: formData.date
    };
    
    // Add prediction data if linked
    if (linkedPrediction) {
      newPost.predicted = linkedPrediction.predictions;
      newPost.predictionId = linkedPrediction.id;
      
      // Calculate accuracy
      const actualEngRate = newPost.followers > 0 
        ? (((newPost.likes + newPost.comments + newPost.shares) / newPost.followers) * 100).toFixed(2)
        : null;
      
      newPost.actualVsPredicted = {
        likesAccuracy: linkedPrediction.predictions.likes 
          ? ((Math.abs(newPost.likes - linkedPrediction.predictions.likes) / linkedPrediction.predictions.likes) * 100).toFixed(1)
          : null,
        commentsAccuracy: linkedPrediction.predictions.comments
          ? ((Math.abs(newPost.comments - linkedPrediction.predictions.comments) / linkedPrediction.predictions.comments) * 100).toFixed(1)
          : null,
        sharesAccuracy: linkedPrediction.predictions.shares
          ? ((Math.abs(newPost.shares - linkedPrediction.predictions.shares) / linkedPrediction.predictions.shares) * 100).toFixed(1)
          : null,
        engRateActual: actualEngRate,
        engRatePredicted: linkedPrediction.predictions.engagementRate
      };
      
      // Remove from tracked optimizations
      setTrackedOptimizations(prev => prev.filter(t => t.id !== linkedPrediction.id));
    }
    
    setPosts(prev => [newPost, ...(prev || [])]);
    
    // Reset form
    setFormData({
      platform: 'Instagram',
      content: '',
      postDetails: '',
      likes: '',
      comments: '',
      shares: '',
      views: '',
      followers: '',
      date: new Date().toISOString().split('T')[0],
      linkedPredictionId: null
    });
    setShowAddForm(false);
    setShowPredictionLink(false);
  };

  const handleDeletePost = (id) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const analyzeWithAI = async () => {
    if (!posts || posts.length === 0) return;
    
    setAnalyzing(true);
    
    const prompt = `Analyze these social media posts and provide insights on what's working:

${posts.map(p => {
  const totalEngagement = p.likes + p.comments + p.shares;
  const engagementRate = p.followers > 0 ? ((totalEngagement / p.followers) * 100).toFixed(2) : 'N/A';
  return `Platform: ${p.platform}
Content: ${p.content}${p.postDetails ? `
Post Details: ${p.postDetails}` : ''}
Engagement: ${p.likes} likes, ${p.comments} comments, ${p.shares} shares, ${p.views} views
Followers at time: ${p.followers}
Engagement Rate: ${engagementRate}%
Date: ${p.date}
---`;
}).join('\n\n')}

Please provide:
1. TOP PERFORMING PATTERNS: What themes, topics, formats, or content types are getting the highest engagement RATES? Look at post details (hooks, format, pacing, visuals) if provided.
2. ENGAGEMENT INSIGHTS: Which posts have high engagement rates vs low? What separates them? Are people liking but not commenting/sharing? Do certain hooks or formats work better?
3. UNDERPERFORMING CONTENT: What posts got lower engagement rates and why might that be? Any patterns in failed content?
4. FORMAT & CREATIVE INSIGHTS: If post details are provided, what creative elements (hooks, pacing, visuals, music, CTA) correlate with success?
5. PLATFORM INSIGHTS: Any platform-specific patterns?
6. CONTENT RECOMMENDATIONS: 5 specific post ideas that could recreate the success of your top-performing content. Include:
   - Recommended hook/opening
   - Suggested format (reel/carousel/static/etc)
   - Content topic/theme
   - Why it will work based on the data

Format your response clearly with these sections.`;

    try {
      const response = await miyagiAPI.post('/generate-text', {
        prompt,
        provider: 'openai',
        model: 'gpt-4o-mini',
        max_tokens: 2000
      });
      
      if (response.success) {
        setInsights({
          text: response.data.text,
          generatedAt: new Date().toISOString()
        });
        setActiveTab('insights');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const optimizePost = async () => {
    if (!labData.contentIdea.trim()) return;
    
    setOptimizing(true);
    
    // Build context from historical posts and prediction accuracy
    const avgFollowers = posts && posts.length > 0 
      ? Math.round(posts.reduce((sum, p) => sum + (p.followers || 0), 0) / posts.filter(p => p.followers > 0).length)
      : 10000;

    const postContext = posts && posts.length > 0 
      ? `\n\nCONTEXT - User's Historical Performance:
${posts.slice(0, 5).map(p => {
  const totalEngagement = p.likes + p.comments + p.shares;
  const engagementRate = p.followers > 0 ? ((totalEngagement / p.followers) * 100).toFixed(2) : 'N/A';
  return `- "${p.content}" (${p.platform}) - ${engagementRate}% engagement${p.postDetails ? ` | Details: ${p.postDetails}` : ''}`;
}).join('\n')}

Average follower count: ${avgFollowers}
Use these successful posts as reference for optimization and predictions.`
      : `\n\nEstimated average follower count: ${avgFollowers}`;

    // Build prediction accuracy feedback
    const predictionFeedback = posts && posts.filter(p => p.predicted).length > 0
      ? `\n\nPREVIOUS PREDICTION ACCURACY:
${posts.filter(p => p.predicted).slice(0, 3).map(p => {
  const actualEngRate = p.followers > 0 ? (((p.likes + p.comments + p.shares) / p.followers) * 100).toFixed(2) : 'N/A';
  const predEngRate = p.predicted.engagementRate || 'N/A';
  return `- Predicted ${predEngRate}% | Actual ${actualEngRate}% | Likes: predicted ${p.predicted.likes}, actual ${p.likes}`;
}).join('\n')}

Learn from these prediction errors to improve accuracy.`
      : '';

    const prompt = `You are a social media content strategist. Optimize this post idea for maximum virality and engagement on ${labData.platform}.

POST IDEA:
Content: ${labData.contentIdea}${labData.hook ? `\nProposed Hook: ${labData.hook}` : ''}${labData.format ? `\nProposed Format: ${labData.format}` : ''}${labData.pacing ? `\nProposed Pacing: ${labData.pacing}` : ''}${labData.visuals ? `\nProposed Visuals: ${labData.visuals}` : ''}${labData.caption ? `\nProposed Caption: ${labData.caption}` : ''}${postContext}${predictionFeedback}

Provide an optimized version with the following sections:

**OPTIMIZED HOOK**
Provide 3 alternative hooks that will stop scrollers. Make them specific to ${labData.platform}.

**OPTIMIZED FORMAT**
What format works best for this content? (Reel, Carousel, Static, Story, etc.) Why?

**PACING & STRUCTURE**
How should the content flow? Timing, cuts, reveals?

**VISUAL STRATEGY**
Colors, text overlays, transitions, b-roll - what will maximize watch time?

**OPTIMIZED CAPTION**
Write a compelling caption that drives engagement. Include emojis and a strong CTA.

**ENGAGEMENT TACTICS**
Specific tactics to boost likes, comments, shares (controversy, questions, relatable moments, etc.)

**TIMING & HASHTAGS**
Best time to post and 5-10 relevant hashtags for ${labData.platform}.

**VIRALITY PREDICTION**
Based on the user's history and ${labData.platform} benchmarks, predict realistic numbers:
- Expected Likes: [number]
- Expected Comments: [number]
- Expected Shares: [number]
- Expected Views: [number]
- Expected Engagement Rate: [percentage]

Be conservative and realistic. Consider the user's average follower count (${avgFollowers}).

**WHY THIS WILL WORK**
Based on platform algorithms and trends, explain why this optimized version will outperform the original.

Be specific and actionable.`;

    try {
      const response = await miyagiAPI.post('/generate-text', {
        prompt,
        provider: 'openai',
        model: 'gpt-4o-mini',
        max_tokens: 2500
      });
      
      if (response.success) {
        // Extract predictions from the text
        const text = response.data.text;
        const likesMatch = text.match(/Expected Likes:\s*(\d+)/i);
        const commentsMatch = text.match(/Expected Comments:\s*(\d+)/i);
        const sharesMatch = text.match(/Expected Shares:\s*(\d+)/i);
        const viewsMatch = text.match(/Expected Views:\s*(\d+)/i);
        const engRateMatch = text.match(/Expected Engagement Rate:\s*([\d.]+)%/i);
        
        const predictions = {
          likes: likesMatch ? parseInt(likesMatch[1]) : null,
          comments: commentsMatch ? parseInt(commentsMatch[1]) : null,
          shares: sharesMatch ? parseInt(sharesMatch[1]) : null,
          views: viewsMatch ? parseInt(viewsMatch[1]) : null,
          engagementRate: engRateMatch ? parseFloat(engRateMatch[1]) : null
        };
        
        setOptimization({
          id: Date.now().toString(),
          text: response.data.text,
          predictions,
          generatedAt: new Date().toISOString(),
          originalIdea: { ...labData }
        });
      }
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const saveTrackedPost = () => {
    if (!optimization) return;
    
    // Add to tracked optimizations
    setTrackedOptimizations(prev => [
      {
        id: optimization.id,
        platform: labData.platform,
        contentIdea: labData.contentIdea,
        predictions: optimization.predictions,
        createdAt: optimization.generatedAt
      },
      ...(prev || [])
    ]);
    
    // Clear lab and show success message
    setLabData({
      platform: 'Instagram',
      contentIdea: '',
      hook: '',
      format: '',
      pacing: '',
      visuals: '',
      caption: ''
    });
    setOptimization(null);
    alert('📊 Predictions saved! Add this post with real stats after publishing to see accuracy.');
  };

  const getEngagementRate = (post) => {
    if (!post.followers || post.followers === 0) return 'N/A';
    const totalEngagement = post.likes + post.comments + post.shares;
    const rate = (totalEngagement / post.followers) * 100;
    return rate.toFixed(2) + '%';
  };

  const getEngagementLevel = (post) => {
    if (!post.followers || post.followers === 0) return null;
    const totalEngagement = post.likes + post.comments + post.shares;
    const rate = (totalEngagement / post.followers) * 100;
    
    // Industry standard benchmarks
    if (rate >= 3) return { label: 'Excellent', color: 'bg-green-50 text-green-600' };
    if (rate >= 1) return { label: 'Good', color: 'bg-blue-50 text-blue-600' };
    if (rate >= 0.5) return { label: 'Average', color: 'bg-yellow-50 text-yellow-600' };
    return { label: 'Low', color: 'bg-red-50 text-red-600' };
  };

  const topPosts = useMemo(() => {
    if (!posts || posts.length === 0) return [];
    return [...posts].sort((a, b) => {
      const scoreA = a.likes + (a.comments * 2) + (a.shares * 3);
      const scoreB = b.likes + (b.comments * 2) + (b.shares * 3);
      return scoreB - scoreA;
    }).slice(0, 3);
  }, [posts]);

  if (!tailwindLoaded) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      {/* Header */}
      <div className="px-12 py-8 border-b" style={{ borderColor: '#f0f0f0' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900">Social Media Tracker</h1>
            <p className="text-sm text-gray-500 mt-2">Track posts, analyze patterns, grow your audience</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-3 rounded-lg font-medium text-white transition-all"
            style={{ 
              backgroundColor: '#3b82f6',
              boxShadow: '0 20px 60px -20px rgba(59, 130, 246, 0.3)'
            }}
          >
            {showAddForm ? 'Cancel' : '+ Add Post'}
          </button>
        </div>
      </div>

      {/* Add Post Form */}
      {showAddForm && (
        <div className="px-12 py-8 border-b" style={{ borderColor: '#f0f0f0', backgroundColor: '#fafafa' }}>
          <h2 className="text-xl font-medium mb-6">Add New Post</h2>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Platform Dropdown */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
              <div ref={platformDropdownRef} className="relative">
                <button
                  onClick={() => setPlatformDropdownOpen(!platformDropdownOpen)}
                  className="w-full px-5 py-3 rounded-lg text-left bg-white transition-all"
                  style={{ 
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  {formData.platform}
                </button>
                
                {platformDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white rounded-lg" style={{ 
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.1)'
                  }}>
                    {['Instagram', 'TikTok', 'X (Twitter)', 'LinkedIn', 'Facebook', 'YouTube'].map(platform => (
                      <button
                        key={platform}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, platform }));
                          setPlatformDropdownOpen(false);
                        }}
                        className="w-full px-5 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Posted</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-5 py-3 rounded-lg bg-white"
                style={{ 
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>

            {/* Content */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Post Caption/Topic</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Describe your post or paste the caption..."
                rows={2}
                className="w-full px-5 py-3 rounded-lg bg-white resize-none"
                style={{ 
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>

            {/* Post Details */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Post Details (Optional)</label>
              <textarea
                value={formData.postDetails}
                onChange={(e) => setFormData(prev => ({ ...prev, postDetails: e.target.value }))}
                placeholder="Hook used, format (carousel/reel/static), pacing, visuals, music, call-to-action, etc..."
                rows={3}
                className="w-full px-5 py-3 rounded-lg bg-white resize-none"
                style={{ 
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                Add context: What hook did you use? Format? Pacing? Visuals? Music? This helps AI understand what worked.
              </p>
            </div>

            {/* Link to Prediction */}
            {trackedOptimizations && trackedOptimizations.length > 0 && (
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={() => setShowPredictionLink(!showPredictionLink)}
                  className="text-sm text-blue-500 hover:text-blue-600 font-medium"
                >
                  {showPredictionLink ? '− Hide' : '+ Link to Post Lab Prediction'}
                </button>
                
                {showPredictionLink && (
                  <div className="mt-3 space-y-2">
                    {trackedOptimizations.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, linkedPredictionId: opt.id }))}
                        className={`w-full p-4 rounded-lg text-left transition-all ${
                          formData.linkedPredictionId === opt.id 
                            ? 'bg-blue-50' 
                            : 'bg-white hover:bg-gray-50'
                        }`}
                        style={{ 
                          border: formData.linkedPredictionId === opt.id 
                            ? '2px solid #3b82f6' 
                            : '1px solid #f0f0f0'
                        }}
                      >
                        <div className="text-sm font-medium text-gray-700 mb-1">{opt.contentIdea.substring(0, 60)}...</div>
                        <div className="text-xs text-gray-500">
                          Predicted: {opt.predictions.likes} likes, {opt.predictions.engagementRate}% engagement
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metrics */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Likes</label>
              <input
                type="number"
                value={formData.likes}
                onChange={(e) => setFormData(prev => ({ ...prev, likes: e.target.value }))}
                placeholder="0"
                className="w-full px-5 py-3 rounded-lg bg-white"
                style={{ 
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
              <input
                type="number"
                value={formData.comments}
                onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="0"
                className="w-full px-5 py-3 rounded-lg bg-white"
                style={{ 
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Shares</label>
              <input
                type="number"
                value={formData.shares}
                onChange={(e) => setFormData(prev => ({ ...prev, shares: e.target.value }))}
                placeholder="0"
                className="w-full px-5 py-3 rounded-lg bg-white"
                style={{ 
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Views</label>
              <input
                type="number"
                value={formData.views}
                onChange={(e) => setFormData(prev => ({ ...prev, views: e.target.value }))}
                placeholder="0"
                className="w-full px-5 py-3 rounded-lg bg-white"
                style={{ 
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                }}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Followers (at time of post)</label>
              <input
                type="number"
                value={formData.followers}
                onChange={(e) => setFormData(prev => ({ ...prev, followers: e.target.value }))}
                placeholder="0"
                className="w-full px-5 py-3 rounded-lg bg-white"
                style={{ 
                  border: '1px solid #f0f0f0',
                  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                Used to calculate accurate engagement rate: (likes + comments + shares) / followers × 100
              </p>
            </div>
          </div>

          <button
            onClick={handleAddPost}
            className="mt-6 px-6 py-3 rounded-lg font-medium text-white transition-all"
            style={{ 
              backgroundColor: '#3b82f6',
              boxShadow: '0 20px 60px -20px rgba(59, 130, 246, 0.3)'
            }}
          >
            Save Post
          </button>
        </div>
      )}

      {/* Stats Summary */}
      {posts && posts.length > 0 && (
        <div className="px-12 py-8 border-b" style={{ borderColor: '#f0f0f0' }}>
          <div className="grid grid-cols-3 gap-6">
            <div className="p-6 rounded-lg bg-white" style={{ 
              border: '1px solid #f0f0f0',
              boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.06)'
            }}>
              <div className="text-sm font-medium text-gray-500">Total Posts</div>
              <div className="text-3xl font-light mt-2">{posts.length}</div>
            </div>
            
            <div className="p-6 rounded-lg bg-white" style={{ 
              border: '1px solid #f0f0f0',
              boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.06)'
            }}>
              <div className="text-sm font-medium text-gray-500">Total Likes</div>
              <div className="text-3xl font-light mt-2">
                {posts.reduce((sum, p) => sum + p.likes, 0).toLocaleString()}
              </div>
            </div>
            
            <div className="p-6 rounded-lg bg-white" style={{ 
              border: '1px solid #f0f0f0',
              boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.06)'
            }}>
              <div className="text-sm font-medium text-gray-500">Total Engagement</div>
              <div className="text-3xl font-light mt-2">
                {posts.reduce((sum, p) => sum + p.likes + p.comments + p.shares, 0).toLocaleString()}
              </div>
            </div>
            
            <div className="p-6 rounded-lg bg-white" style={{ 
              border: '1px solid #f0f0f0',
              boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.06)'
            }}>
              <div className="text-sm font-medium text-gray-500">Avg Engagement Rate</div>
              <div className="text-3xl font-light mt-2">
                {(() => {
                  const postsWithFollowers = posts.filter(p => p.followers > 0);
                  if (postsWithFollowers.length === 0) return 'N/A';
                  const avgRate = postsWithFollowers.reduce((sum, p) => {
                    const totalEngagement = p.likes + p.comments + p.shares;
                    return sum + (totalEngagement / p.followers) * 100;
                  }, 0) / postsWithFollowers.length;
                  return avgRate.toFixed(2) + '%';
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-12 py-6 border-b" style={{ borderColor: '#f0f0f0' }}>
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('posts')}
            className={`pb-2 font-medium transition-all ${
              activeTab === 'posts' ? 'text-blue-500' : 'text-gray-400'
            }`}
            style={{
              borderBottom: activeTab === 'posts' ? '2px solid #3b82f6' : '2px solid transparent'
            }}
          >
            All Posts
          </button>
          <button
            onClick={() => setActiveTab('lab')}
            className={`pb-2 font-medium transition-all ${
              activeTab === 'lab' ? 'text-blue-500' : 'text-gray-400'
            }`}
            style={{
              borderBottom: activeTab === 'lab' ? '2px solid #3b82f6' : '2px solid transparent'
            }}
          >
            Post Lab
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`pb-2 font-medium transition-all ${
              activeTab === 'insights' ? 'text-blue-500' : 'text-gray-400'
            }`}
            style={{
              borderBottom: activeTab === 'insights' ? '2px solid #3b82f6' : '2px solid transparent'
            }}
          >
            AI Insights
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-12 py-8">
        {activeTab === 'posts' && (
          <div>
            {!posts || posts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-gray-400 text-lg">No posts yet</div>
                <p className="text-gray-400 mt-2">Add your first post to start tracking</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map(post => (
                  <div
                    key={post.id}
                    className="p-6 rounded-lg bg-white"
                    style={{ 
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.06)'
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                            {post.platform}
                          </span>
                          <span className="text-sm text-gray-400">{post.date}</span>
                          {getEngagementLevel(post) && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEngagementLevel(post).color}`}>
                              {getEngagementLevel(post).label} - {getEngagementRate(post)}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-gray-700 mb-2">{post.content}</p>
                        {post.postDetails && (
                          <p className="text-sm text-gray-500 mb-4 italic">{post.postDetails}</p>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="text-gray-600">
                            <span className="font-medium">{post.likes.toLocaleString()}</span> likes
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">{post.comments.toLocaleString()}</span> comments
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">{post.shares.toLocaleString()}</span> shares
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">{post.views.toLocaleString()}</span> views
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">{post.followers.toLocaleString()}</span> followers
                          </div>
                        </div>

                        {/* Prediction vs Actual */}
                        {post.predicted && post.actualVsPredicted && (
                          <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#fafafa' }}>
                            <div className="text-xs font-medium text-gray-500 mb-3 flex items-center">
                              🎯 AI PREDICTION ACCURACY
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-xs">
                              <div>
                                <div className="text-gray-500 mb-1">Likes</div>
                                <div className="font-medium text-gray-700">
                                  {post.predicted.likes} → {post.likes}
                                </div>
                                <div className={`text-xs ${parseFloat(post.actualVsPredicted.likesAccuracy) < 30 ? 'text-green-600' : 'text-orange-600'}`}>
                                  {post.actualVsPredicted.likesAccuracy}% off
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 mb-1">Comments</div>
                                <div className="font-medium text-gray-700">
                                  {post.predicted.comments} → {post.comments}
                                </div>
                                <div className={`text-xs ${parseFloat(post.actualVsPredicted.commentsAccuracy) < 30 ? 'text-green-600' : 'text-orange-600'}`}>
                                  {post.actualVsPredicted.commentsAccuracy}% off
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 mb-1">Shares</div>
                                <div className="font-medium text-gray-700">
                                  {post.predicted.shares} → {post.shares}
                                </div>
                                <div className={`text-xs ${parseFloat(post.actualVsPredicted.sharesAccuracy) < 30 ? 'text-green-600' : 'text-orange-600'}`}>
                                  {post.actualVsPredicted.sharesAccuracy}% off
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 mb-1">Engagement Rate</div>
                                <div className="font-medium text-gray-700">
                                  {post.actualVsPredicted.engRatePredicted}% → {post.actualVsPredicted.engRateActual}%
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {posts && posts.length > 0 && (
              <div className="mt-8 text-center">
                <button
                  onClick={analyzeWithAI}
                  disabled={analyzing}
                  className="px-8 py-4 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                  style={{ 
                    backgroundColor: '#3b82f6',
                    boxShadow: '0 20px 60px -20px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {analyzing ? 'Analyzing...' : '🤖 Analyze with AI'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'lab' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-light mb-2">Post Lab</h2>
              <p className="text-gray-500">Optimize your content idea for maximum virality before posting</p>
            </div>

            {/* Lab Input Form */}
            <div className="mb-8 p-8 rounded-lg bg-white" style={{ 
              border: '1px solid #f0f0f0',
              boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.06)'
            }}>
              <h3 className="text-lg font-medium mb-6">Your Content Idea</h3>
              
              <div className="space-y-6">
                {/* Platform */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <div ref={labPlatformDropdownRef} className="relative">
                    <button
                      onClick={() => setLabPlatformDropdownOpen(!labPlatformDropdownOpen)}
                      className="w-full px-5 py-3 rounded-lg text-left bg-white transition-all"
                      style={{ 
                        border: '1px solid #f0f0f0',
                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      {labData.platform}
                    </button>
                    
                    {labPlatformDropdownOpen && (
                      <div className="absolute z-10 w-full mt-2 bg-white rounded-lg" style={{ 
                        border: '1px solid #f0f0f0',
                        boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.1)'
                      }}>
                        {['Instagram', 'TikTok', 'X (Twitter)', 'LinkedIn', 'Facebook', 'YouTube'].map(platform => (
                          <button
                            key={platform}
                            onClick={() => {
                              setLabData(prev => ({ ...prev, platform }));
                              setLabPlatformDropdownOpen(false);
                            }}
                            className="w-full px-5 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                          >
                            {platform}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Idea */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content Idea (Required)</label>
                  <textarea
                    value={labData.contentIdea}
                    onChange={(e) => setLabData(prev => ({ ...prev, contentIdea: e.target.value }))}
                    placeholder="What's your post about? Describe your content idea..."
                    rows={4}
                    className="w-full px-5 py-3 rounded-lg bg-white resize-none"
                    style={{ 
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Hook */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hook/Opening (Optional)</label>
                    <input
                      type="text"
                      value={labData.hook}
                      onChange={(e) => setLabData(prev => ({ ...prev, hook: e.target.value }))}
                      placeholder="e.g., 'Stop scrolling if...'"
                      className="w-full px-5 py-3 rounded-lg bg-white"
                      style={{ 
                        border: '1px solid #f0f0f0',
                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                      }}
                    />
                  </div>

                  {/* Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Format (Optional)</label>
                    <input
                      type="text"
                      value={labData.format}
                      onChange={(e) => setLabData(prev => ({ ...prev, format: e.target.value }))}
                      placeholder="e.g., Carousel, Reel, Static"
                      className="w-full px-5 py-3 rounded-lg bg-white"
                      style={{ 
                        border: '1px solid #f0f0f0',
                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                      }}
                    />
                  </div>

                  {/* Pacing */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pacing (Optional)</label>
                    <input
                      type="text"
                      value={labData.pacing}
                      onChange={(e) => setLabData(prev => ({ ...prev, pacing: e.target.value }))}
                      placeholder="e.g., Fast cuts, slow reveal"
                      className="w-full px-5 py-3 rounded-lg bg-white"
                      style={{ 
                        border: '1px solid #f0f0f0',
                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                      }}
                    />
                  </div>

                  {/* Visuals */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Visuals (Optional)</label>
                    <input
                      type="text"
                      value={labData.visuals}
                      onChange={(e) => setLabData(prev => ({ ...prev, visuals: e.target.value }))}
                      placeholder="e.g., Bold text, gradient bg"
                      className="w-full px-5 py-3 rounded-lg bg-white"
                      style={{ 
                        border: '1px solid #f0f0f0',
                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                      }}
                    />
                  </div>
                </div>

                {/* Caption */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Caption Draft (Optional)</label>
                  <textarea
                    value={labData.caption}
                    onChange={(e) => setLabData(prev => ({ ...prev, caption: e.target.value }))}
                    placeholder="Your caption or script..."
                    rows={3}
                    className="w-full px-5 py-3 rounded-lg bg-white resize-none"
                    style={{ 
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                    }}
                  />
                </div>
              </div>

              <button
                onClick={optimizePost}
                disabled={optimizing || !labData.contentIdea.trim()}
                className="mt-6 px-8 py-4 rounded-lg font-medium text-white transition-all disabled:opacity-50"
                style={{ 
                  backgroundColor: '#3b82f6',
                  boxShadow: '0 20px 60px -20px rgba(59, 130, 246, 0.3)'
                }}
              >
                {optimizing ? 'Optimizing...' : '🚀 Optimize for Virality'}
              </button>
            </div>

            {/* Optimization Results */}
            {optimization && (
              <div className="p-8 rounded-lg bg-white" style={{ 
                border: '1px solid #f0f0f0',
                boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.06)'
              }}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-medium">Optimization Results</h3>
                  <span className="text-sm text-gray-400">
                    Generated {new Date(optimization.generatedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Original Idea Recap */}
                <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#fafafa' }}>
                  <div className="text-xs font-medium text-gray-500 mb-2">YOUR ORIGINAL IDEA</div>
                  <p className="text-sm text-gray-700">{optimization.originalIdea.contentIdea}</p>
                </div>

                {/* Virality Predictions */}
                {optimization.predictions && (optimization.predictions.likes || optimization.predictions.engagementRate) && (
                  <div className="mb-6 p-6 rounded-lg" style={{ backgroundColor: '#eff6ff', border: '1px solid #3b82f6' }}>
                    <div className="text-sm font-medium text-blue-900 mb-4 flex items-center">
                      📊 AI VIRALITY PREDICTION
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                      {optimization.predictions.likes && (
                        <div>
                          <div className="text-xs text-blue-700 mb-1">Likes</div>
                          <div className="text-2xl font-light text-blue-900">{optimization.predictions.likes.toLocaleString()}</div>
                        </div>
                      )}
                      {optimization.predictions.comments && (
                        <div>
                          <div className="text-xs text-blue-700 mb-1">Comments</div>
                          <div className="text-2xl font-light text-blue-900">{optimization.predictions.comments.toLocaleString()}</div>
                        </div>
                      )}
                      {optimization.predictions.shares && (
                        <div>
                          <div className="text-xs text-blue-700 mb-1">Shares</div>
                          <div className="text-2xl font-light text-blue-900">{optimization.predictions.shares.toLocaleString()}</div>
                        </div>
                      )}
                      {optimization.predictions.views && (
                        <div>
                          <div className="text-xs text-blue-700 mb-1">Views</div>
                          <div className="text-2xl font-light text-blue-900">{optimization.predictions.views.toLocaleString()}</div>
                        </div>
                      )}
                      {optimization.predictions.engagementRate && (
                        <div>
                          <div className="text-xs text-blue-700 mb-1">Engagement Rate</div>
                          <div className="text-2xl font-light text-blue-900">{optimization.predictions.engagementRate}%</div>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 text-xs text-blue-700">
                      💡 Track this prediction by saving it, then linking it when you add the post with real stats
                    </div>
                  </div>
                )}

                {/* AI Recommendations */}
                <div className="prose max-w-none mb-6">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {optimization.text}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={saveTrackedPost}
                    className="px-8 py-4 rounded-lg font-medium text-white transition-all"
                    style={{ 
                      backgroundColor: '#10b981',
                      boxShadow: '0 20px 60px -20px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    💾 Save & Track Predictions
                  </button>

                  <button
                    onClick={optimizePost}
                    disabled={optimizing}
                    className="px-6 py-3 rounded-lg font-medium transition-all"
                    style={{
                      border: '1px solid #f0f0f0',
                      color: '#3b82f6'
                    }}
                  >
                    {optimizing ? 'Regenerating...' : '🔄 Regenerate'}
                  </button>
                  
                  <button
                    onClick={() => setOptimization(null)}
                    className="px-6 py-3 rounded-lg font-medium transition-all"
                    style={{
                      border: '1px solid #f0f0f0',
                      color: '#6b7280'
                    }}
                  >
                    Clear & Start New
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div>
            {!insights ? (
              <div className="text-center py-16">
                <div className="text-gray-400 text-lg">No insights yet</div>
                <p className="text-gray-400 mt-2">Click "Analyze with AI" to generate insights</p>
              </div>
            ) : (
              <div>
                {/* Top Performing Posts */}
                {topPosts.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-medium mb-4">Top Performing Posts</h2>
                    <div className="grid gap-4">
                      {topPosts.map((post, idx) => (
                        <div
                          key={post.id}
                          className="p-5 rounded-lg bg-white"
                          style={{ 
                            border: '1px solid #f0f0f0',
                            boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="text-2xl font-light text-gray-400">#{idx + 1}</span>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-600">
                              {post.platform}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mb-2">{post.content}</p>
                          <div className="text-xs text-gray-500">
                            {post.likes} likes · {post.comments} comments · {post.shares} shares
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                <div
                  className="p-8 rounded-lg bg-white"
                  style={{ 
                    border: '1px solid #f0f0f0',
                    boxShadow: '0 20px 60px -20px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-medium">AI Analysis</h2>
                    <span className="text-sm text-gray-400">
                      Generated {new Date(insights.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {insights.text}
                    </div>
                  </div>
                  
                  <button
                    onClick={analyzeWithAI}
                    disabled={analyzing}
                    className="mt-6 px-6 py-3 rounded-lg font-medium transition-all"
                    style={{
                      border: '1px solid #f0f0f0',
                      color: '#3b82f6'
                    }}
                  >
                    {analyzing ? 'Regenerating...' : '🔄 Regenerate Analysis'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SocialMediaTracker;
