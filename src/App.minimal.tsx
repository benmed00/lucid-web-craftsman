import React from 'react';
import './index.css';

// Production build - logging disabled

const App = () => {
  const [test] = React.useState('working');
  
  // Component rendering - logging disabled for production
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">App is working!</h1>
      <p>React hooks test: {test}</p>
    </div>
  );
};

export default App;