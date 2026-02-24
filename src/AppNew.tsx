import React from 'react';
import './index.css';

// Cache buster component - completely new file
const AppNew = () => {
  // Production build - logging disabled

  const [status] = React.useState('✅ Working!');

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Cache Cleared ✨</h1>
        <p className="text-lg mb-4">Status: {status}</p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p>React hooks are working properly!</p>
          <p className="text-sm mt-2">Build timestamp: {Date.now()}</p>
        </div>
      </div>
    </div>
  );
};

export default AppNew;
