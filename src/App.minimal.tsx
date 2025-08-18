import React from 'react';
import './index.css';

console.log('App.minimal.tsx loaded');
console.log('React object:', React);
console.log('React.useState:', React.useState);

const App = () => {
  const [test] = React.useState('working');
  
  console.log('App component rendered, test state:', test);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">App is working!</h1>
      <p>React hooks test: {test}</p>
    </div>
  );
};

export default App;