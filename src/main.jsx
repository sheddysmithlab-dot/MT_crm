import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { ThemeProvider } from './hooks/ThemeProvider.jsx'
import ErrorOverlay from './components/ErrorOverlay'
import { initializePermissionSystem } from './utils/permissionHelpers'
import './utils/globalErrorHandler'
import './utils/errorLogger'

const isElectron = typeof window !== 'undefined' && !!window.electron?.isElectron;
const useApi =
  import.meta.env.VITE_USE_API === 'true' ||
  (import.meta.env.VITE_USE_API !== 'false' && !isElectron);

// Desktop-only bootstraps (skipped in web API mode)
if (!useApi) {
  import('./utils/adminSetup').catch(() => {});
  import('./utils/pathConfig')
    .then((m) => m.initPathConfig?.().catch(console.error))
    .catch(() => {});
  import('./utils/writeBehindCacheManager').catch(() => {});
}

initializePermissionSystem().catch(console.error);

if (useApi) {
  console.log('🚀 Malwa CRM — Web API mode (Option B)');
  console.log('🌐 Backend:', import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api');
} else {
  console.log('🚀 Malwa CRM v2.0.0 - Desktop / local mode');
  console.log('📁 Database Location: C:/malwa-crm/Data_base/');
}

window.addEventListener('error', (e) => {
  console.error('Global error captured:', e.error || e.message, e);
});

window.addEventListener('unhandledrejection', (e) => {
  console.warn('Promise rejection (handled):', e.reason);
});

// Use HashRouter when running from file:// (Electron packaged build)
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <ThemeProvider>
        <ErrorOverlay>
          <App />
        </ErrorOverlay>
      </ThemeProvider>
    </Router>
  </React.StrictMode>,
)
