import React, { useRef } from 'react';

/**
 * Storage Demo Widget
 * 
 * Demonstrates the unified useStorage hook with different scopes:
 * - Global (default): Shared with everybody
 * - User: Private to current user only (namespaced by userId)
 */
function StorageDemoWidget() {
  // Get current user
  const { user, isLoading: userLoading } = useUser();
  
  // GLOBAL STORAGE - shared with everybody on the canvas
  const [sharedCount, setSharedCount] = useStorage('demo-count', 0);
  const [sharedMessages, setSharedMessages] = useStorage('demo-messages', []);
  
  // USER STORAGE - private to current user only (key is namespaced with userId)
  const [privateNote, setPrivateNote] = useStorage('my-note', '', { scope: 'user' });
  const [privateColor, setPrivateColor] = useStorage('my-color', '#6366f1', { scope: 'user' });
  
  const messageInputRef = useRef(null);
  
  // Add shared message
  const addMessage = () => {
    const text = messageInputRef.current?.value?.trim();
    if (!text) return;
    
    setSharedMessages(prev => [
      ...prev,
      { 
        id: Date.now(), 
        text, 
        time: new Date().toLocaleTimeString(),
        author: user?.name || 'Anonymous'
      }
    ].slice(-5)); // Keep last 5 messages
    
    messageInputRef.current.value = '';
  };
  
  const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444'];
  
  if (userLoading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>
        Loading user...
      </div>
    );
  }
  
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#fafafa',
      minHeight: '100vh',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1f2937' }}>
        🔄 Storage Scope Demo
      </h2>
      
      {/* User info */}
      <div style={{ 
        fontSize: '12px', 
        color: '#6b7280', 
        marginBottom: '16px',
        padding: '8px 12px',
        background: '#f3f4f6',
        borderRadius: '6px'
      }}>
        👤 Logged in as: <strong>{user?.name || 'Guest'}</strong>
        {user?.id && <span style={{ opacity: 0.6 }}> ({user.id.slice(0, 8)}...)</span>}
      </div>
      
      {/* GLOBAL SECTION */}
      <div style={{
        background: '#dbeafe',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: '#1e40af',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          🌍 SHARED WITH EVERYBODY
          <span style={{ 
            background: '#1e40af', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '10px'
          }}>
            useStorage(key, default)
          </span>
        </div>
        
        {/* Shared Counter */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '12px'
        }}>
          <span style={{ color: '#374151' }}>Counter:</span>
          <button onClick={() => setSharedCount(c => c - 1)} style={btnStyle}>−</button>
          <span style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: '#1e40af',
            minWidth: '40px',
            textAlign: 'center'
          }}>
            {sharedCount}
          </span>
          <button onClick={() => setSharedCount(c => c + 1)} style={btnStyle}>+</button>
        </div>
        
        {/* Shared Messages */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              ref={messageInputRef}
              placeholder="Type a message everyone can see..."
              onKeyDown={e => e.key === 'Enter' && addMessage()}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #93c5fd',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            />
            <button onClick={addMessage} style={btnStyle}>Send</button>
          </div>
          
          <div style={{ 
            background: 'white', 
            borderRadius: '6px', 
            padding: '8px',
            minHeight: '60px',
            fontSize: '12px'
          }}>
            {sharedMessages.length === 0 ? (
              <span style={{ color: '#9ca3af' }}>No messages yet...</span>
            ) : (
              sharedMessages.map(m => (
                <div key={m.id} style={{ padding: '4px 0', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 500 }}>{m.author}</span>
                  <span style={{ color: '#9ca3af', marginLeft: '8px' }}>{m.time}</span>
                  <div style={{ color: '#374151' }}>{m.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* USER SECTION */}
      <div style={{
        background: '#fce7f3',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 600, 
          color: '#be185d',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          🔒 PRIVATE TO YOU
          <span style={{ 
            background: '#be185d', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px',
            fontSize: '10px'
          }}>
            useStorage(key, default, {'{'} scope: 'user' {'}'})
          </span>
        </div>
        
        {!user ? (
          <div style={{ color: '#be185d', fontSize: '13px', padding: '12px', background: 'white', borderRadius: '6px' }}>
            ⚠️ Sign in to use private storage
          </div>
        ) : (
          <>
            {/* Private Color Picker */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#374151', fontSize: '13px' }}>Your favorite color:</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setPrivateColor(c)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: c,
                      border: privateColor === c ? '3px solid #1f2937' : '2px solid white',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Private Note */}
            <div>
              <span style={{ color: '#374151', fontSize: '13px' }}>Your private note:</span>
              <textarea
                value={privateNote}
                onChange={e => setPrivateNote(e.target.value)}
                placeholder="Only you can see this..."
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '10px',
                  border: '1px solid #f9a8d4',
                  borderRadius: '6px',
                  fontSize: '13px',
                  minHeight: '80px',
                  resize: 'none',
                  boxSizing: 'border-box',
                  background: 'white'
                }}
              />
            </div>
            
            {/* Visual indicator */}
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: privateColor,
              borderRadius: '6px',
              color: 'white',
              fontSize: '12px',
              textAlign: 'center'
            }}>
              This color is only visible to you!
            </div>
          </>
        )}
      </div>
      
      {/* Info */}
      <div style={{ 
        marginTop: '16px', 
        fontSize: '11px', 
        color: '#6b7280',
        textAlign: 'center'
      }}>
        Open this widget in multiple browsers (different accounts) to test!<br/>
        Blue section syncs across all users. Pink section is private per user.
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '8px 16px',
  border: 'none',
  borderRadius: '6px',
  background: '#3b82f6',
  color: 'white',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer'
};

export default StorageDemoWidget;
