
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { VaultProvider } from './context/VaultContext';
import { WebRTCProvider } from './context/WebRTCContext';

// Axios and crypto-js are expected to be available in the environment.
// In a real project, you would add them to package.json.
// For example:
// "dependencies": {
//   "axios": "^1.6.0",
//   "crypto-js": "^4.2.0",
//   ...
// },
// "devDependencies": {
//   "@types/crypto-js": "^4.2.0",
//   ...
// }

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { Capacitor } from '@capacitor/core';

if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <VaultProvider>
      <WebRTCProvider>
        <App />
      </WebRTCProvider>
    </VaultProvider>
  </React.StrictMode>
);
