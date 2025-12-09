import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 🔥 GLOBAL ERROR LOGGERS (can only come AFTER imports)
window.addEventListener("error", (e) => {
  console.error("🔥 GLOBAL ERROR:", e.message, e.filename, e.lineno);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("🔥 PROMISE ERROR:", e.reason);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance monitor
reportWebVitals();
