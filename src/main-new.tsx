import React from "react";
import { createRoot } from 'react-dom/client';
import './index.css';

// Completely fresh React component with zero dependencies
const FreshApp = () => {
  console.log('FreshApp loaded - bypassing all cache');
  console.log('React instance:', React);
  
  // Use React.useState explicitly to avoid any import issues
  const [message] = React.useState('✅ React hooks working!');
  const [timestamp] = React.useState(Date.now());
  
  return React.createElement('div', {
    className: 'min-h-screen bg-white p-8 font-sans'
  }, [
    React.createElement('div', {
      key: 'container',
      className: 'max-w-2xl mx-auto text-center'
    }, [
      React.createElement('h1', {
        key: 'title',
        className: 'text-4xl font-bold text-green-600 mb-6'
      }, 'Cache Successfully Cleared! 🎉'),
      React.createElement('p', {
        key: 'message', 
        className: 'text-xl mb-4'
      }, message),
      React.createElement('p', {
        key: 'timestamp',
        className: 'text-gray-600'
      }, `Fresh build: ${timestamp}`),
      React.createElement('div', {
        key: 'success',
        className: 'mt-8 p-4 bg-green-100 rounded-lg border border-green-300'
      }, [
        React.createElement('p', {
          key: 'success-text',
          className: 'text-green-800'
        }, 'React is working properly with useState!')
      ])
    ])
  ]);
};

console.log('Creating root on element:', document.getElementById("root-new"));
const root = createRoot(document.getElementById("root-new")!);
root.render(React.createElement(FreshApp));