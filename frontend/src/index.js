import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AppProvider } from './context/AppContext';
import { Toaster } from 'react-hot-toast';

// Sentry configuration (disabled for development)
// import * as Sentry from '@sentry/react';
// import { BrowserTracing } from '@sentry/tracing';

// Initialize Sentry (disabled to prevent connection errors)
// Sentry.init({
//   dsn: process.env.REACT_APP_SENTRY_DSN || 'https://ac81b3ddf471ac69ae20a2a822e794ab@o4509915357184000.ingest.de.sentry.io/4509925486493776',
//   integrations: [
//     new BrowserTracing(),
//   ],
//   tracesSampleRate: 1.0,
//   environment: process.env.NODE_ENV || 'development',
// });

console.log('Sentry monitoring disabled for development');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AppProvider>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#4aed88',
            },
          },
        }}
      />
    </AppProvider>
);