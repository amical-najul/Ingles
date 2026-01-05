import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log("index.tsx executing...");
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}
console.log("Root element found", rootElement);

const root = ReactDOM.createRoot(rootElement);
console.log("Root created, rendering App...");
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log("Render called");