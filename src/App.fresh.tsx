import React from 'react';

// Ultra minimal React app - zero imports from existing codebase
// Production build - logging disabled

const FreshApp: React.FC = () => {
  const [working, setWorking] = React.useState(true);
  
  // Component rendering - logging disabled for production
  
  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0'
    }}>
      <h1 style={{ color: '#22c55e', fontSize: '2rem', marginBottom: '1rem' }}>
        🎉 Fresh React App Loaded!
      </h1>
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <p style={{ fontSize: '1.2rem', color: '#16a34a' }}>
          ✅ React hooks working: {working ? 'YES' : 'NO'}
        </p>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Build timestamp: {new Date().toISOString()}
        </p>
        <button
          onClick={() => setWorking(!working)}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Toggle Status
        </button>
      </div>
    </div>
  );
};

export default FreshApp;