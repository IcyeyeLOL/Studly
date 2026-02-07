import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

function CommunityEssay() {
  const [tailwindLoaded, setTailwindLoaded] = useState(false);
  const [editMode, setEditMode] = useStorage('essay-edit-mode', false, { scope: 'user' });
  const [essayContent, setEssayContent] = useStorage('essay-content', getDefaultEssay(), { scope: 'user' });
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
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

  useEffect(() => {
    const words = essayContent.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }, [essayContent]);

  if (!tailwindLoaded) {
    return (
      <div style={{ 
        padding: '60px', 
        textAlign: 'center', 
        fontFamily: 'Inter, Helvetica, sans-serif',
        color: '#9ca3af'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, Helvetica, sans-serif' }} className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium tracking-widest text-gray-400 uppercase">
              College Application Essay
            </span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">
                {wordCount} words
              </span>
              <button
                onClick={() => setEditMode(!editMode)}
                className="px-4 py-2 text-xs font-medium rounded-lg transition-all duration-200"
                style={{
                  background: editMode ? '#4F46E5' : '#fafafa',
                  color: editMode ? '#ffffff' : '#6b7280',
                  border: editMode ? 'none' : '1px solid #f0f0f0'
                }}
              >
                {editMode ? 'Save' : 'Edit'}
              </button>
            </div>
          </div>
          
          <h1 className="text-3xl font-semibold text-gray-900 mb-3 leading-tight">
            Community Influence
          </h1>
          
          <p className="text-gray-400 text-sm leading-relaxed">
            We all contribute to, and are influenced by, the communities that are meaningful to us. 
            Share how you've been shaped by one of the communities you belong to.
          </p>
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-gray-200 mb-12"></div>

        {/* Essay Content */}
        <div className="mb-16">
          {editMode ? (
            <textarea
              value={essayContent}
              onChange={(e) => setEssayContent(e.target.value)}
              className="w-full min-h-[600px] text-gray-700 text-base leading-relaxed resize-none focus:outline-none p-6 rounded-xl"
              style={{
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                fontFamily: 'Inter, Helvetica, sans-serif'
              }}
              placeholder="Write your essay here..."
            />
          ) : (
            <div className="prose prose-gray max-w-none">
              {essayContent.split('\n\n').map((paragraph, index) => (
                <p 
                  key={index} 
                  className="text-gray-700 text-base leading-relaxed mb-6"
                  style={{ textIndent: index > 0 ? '2em' : '0' }}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="pt-8"
          style={{ borderTop: '1px solid #f0f0f0' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Olakunle D. Ajani</p>
              <p className="text-xs text-gray-400 mt-1">Northwestern Private Christian College, Class of 2029</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">lime17451@gmail.com</p>
              <p className="text-xs text-gray-400">(443) 891-5273</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDefaultEssay() {
  return `The fluorescent lights of Room 214 flickered as I stared at the wreckage of our robot—a tangled mess of servos, aluminum, and three months of sleepless weekends. Our first regional competition was in six days, and our autonomous navigation system had just fried itself during a test run. As president of the Glen Burnie High School Robotics Club, I had two choices: accept defeat or rally a team that was already running on fumes.

I chose neither. Instead, I chose to listen.

That night, I called an emergency meeting. Rather than presenting solutions, I asked each of the fourteen members to share what they believed went wrong and what they would do differently. Marcus, our quietest freshman, suggested we had overcomplicated the circuit design. Destiny, who had joined robotics to fulfill a graduation requirement, pointed out that we had been so focused on impressive features that we had neglected basic reliability. Their insights weren't revolutionary, but they were honest—and honesty, I realized, was exactly what our club had been missing.

The Robotics Club became my community not because I led it, but because it transformed how I understood leadership itself. When I first took over as president sophomore year, I believed leadership meant having all the answers. I would arrive at meetings with detailed agendas, predetermined solutions, and little patience for deviation. Our club functioned, but it didn't thrive. Members completed tasks but rarely proposed ideas. We built robots that worked but never exceeded expectations.

The broken robot changed everything. In those six days before competition, I watched our club evolve from a hierarchy into a true collaborative community. We divided into specialized teams—not because I assigned them, but because members naturally gravitated toward their strengths. The engineering pathway training from my BMAH program helped me facilitate technical discussions, but it was the collective intelligence of our community that solved the problem. We rebuilt our robot from scratch, simplifying the design while improving functionality.

We placed seventh at regionals—not a trophy-worthy finish, but a victory nonetheless. More importantly, I witnessed fourteen individuals become a genuine community, united not by my direction but by shared purpose and mutual respect.

This experience reshaped every community I've touched since. When I founded the Sports Analyst Club, I began not with my vision but with questions: What do you want to learn? What problems do you see? How can we solve them together? When volunteering with Fem Equity, I learned to direct people not by commanding but by empowering. Even my small e-commerce venture, Solitaire.org, operates on principles I learned in that robotics room—collaboration over control, listening over lecturing.

The Robotics Club taught me that communities are not built by leaders who have all the answers, but by leaders who ask the right questions. My role is not to solve every problem but to create spaces where others feel safe contributing their unique perspectives. Whether I'm helping pack diapers at Chick-fil-A Leadership Academy or managing team members at my IT internship, I carry this understanding with me.

Now, as I prepare for college, I don't aspire to join communities where I can demonstrate expertise. I seek communities where I can continue learning the art of collective problem-solving—where my background in engineering, entrepreneurship, and athletics can contribute to something larger than myself. The fluorescent lights of Room 214 still flicker in my memory, not as a reminder of failure, but as a testament to what happens when a community truly comes together.`;
}

export default CommunityEssay;
