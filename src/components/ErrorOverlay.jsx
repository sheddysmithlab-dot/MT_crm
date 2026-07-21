import React from 'react';
import { toast } from 'sonner';

class ErrorOverlay extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    
    // Enhanced error logging with context
    console.error('🚨 ErrorOverlay caught error:', {
      error: error.toString(),
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Log to database if available
    this.logErrorToDatabase(error, info);
    
    // Show toast notification
    toast.error('Application Error: ' + (error.message || 'Something went wrong'), {
      duration: 5000,
      position: 'top-center'
    });
  }

  async logErrorToDatabase(error, info) {
    try {
      // Try to log error to database for debugging
      if (window.dbOperations) {
        await window.dbOperations.insert('audit_logs', {
          id: 'error_' + Date.now(),
          action: 'APPLICATION_ERROR',
          performedBy: 'system',
          details: {
            error: error.toString(),
            stack: error.stack,
            componentStack: info.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children || null;

    const message = this.state.error?.toString() || 'An unexpected error occurred';
    const stack = this.state.info?.componentStack || this.state.error?.stack || '';
    const isDev = process.env.NODE_ENV === 'development';

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.95)',
        color: '#fff',
        padding: 20,
        zIndex: 999999,
        overflow: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            background: '#dc2626', 
            padding: '12px 16px', 
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>🚨</span>
            <h1 style={{ margin: 0, fontSize: '18px' }}>Malwa CRM v2.0.0 - Application Error</h1>
          </div>
          
          <div style={{ 
            background: '#1f2937', 
            padding: '20px',
            borderRadius: '0 0 8px 8px',
            border: '1px solid #374151'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ color: '#ef4444', margin: '0 0 8px 0' }}>Error Message:</h3>
              <p style={{ background: '#374151', padding: '12px', borderRadius: '4px', margin: 0 }}>
                {message}
              </p>
            </div>

            {isDev && stack && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ color: '#f59e0b', margin: '0 0 8px 0' }}>Stack Trace:</h3>
                <pre style={{ 
                  background: '#111827', 
                  padding: '12px', 
                  borderRadius: '4px', 
                  whiteSpace: 'pre-wrap', 
                  fontSize: '12px',
                  lineHeight: '1.4',
                  border: '1px solid #374151',
                  maxHeight: '300px',
                  overflow: 'auto'
                }}>
                  {stack}
                </pre>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ color: '#10b981', margin: '0 0 8px 0' }}>Troubleshooting:</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                <li>Try refreshing the page</li>
                <li>Check your internet connection</li>
                <li>Clear browser cache and reload</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => location.reload()} 
                style={{ 
                  padding: '10px 16px', 
                  borderRadius: '6px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🔄 Reload Application
              </button>
              
              <button 
                onClick={() => this.setState({ hasError: false, error: null, info: null })} 
                style={{ 
                  padding: '10px 16px', 
                  borderRadius: '6px',
                  background: '#059669',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🔄 Try Again
              </button>

              <button 
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  location.reload();
                }} 
                style={{ 
                  padding: '10px 16px', 
                  borderRadius: '6px',
                  background: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🗑️ Clear Data & Reload
              </button>
            </div>

            <div style={{ 
              marginTop: '20px', 
              padding: '12px', 
              background: '#374151', 
              borderRadius: '4px',
              fontSize: '12px',
              color: '#9ca3af'
            }}>
              <strong>System Info:</strong> {navigator.userAgent}<br/>
              <strong>Timestamp:</strong> {new Date().toLocaleString()}<br/>
              <strong>URL:</strong> {window.location.href}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorOverlay;
