
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { VaultProvider } from './context/VaultContext';

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

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <VaultProvider>
      <App />
    </VaultProvider>
  </React.StrictMode>
);
