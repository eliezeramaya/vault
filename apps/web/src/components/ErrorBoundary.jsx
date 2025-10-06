import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError() {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // You can also log the error to an error reporting service here
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-wrap, #0a0a15)',
          color: 'var(--text, #EAEAEA)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              color: '#f87171',
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              <AlertTriangle size={48} />
            </div>
            
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              margin: '0 0 16px 0',
              color: 'var(--text)'
            }}>
              ¡Oops! Algo salió mal
            </h1>
            
            <p style={{
              fontSize: '16px',
              lineHeight: '1.5',
              margin: '0 0 24px 0',
              opacity: 0.9
            }}>
              La aplicación encontró un error inesperado. Puedes intentar recargar la página o contactar soporte si el problema persiste.
            </p>

            {this.state.error && (
              <details style={{
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  Detalles del error
                </summary>
                <pre data-testid="error-details" style={{
                  fontSize: '12px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  fontFamily: 'monospace'
                }}>
                  {this.state.error?.message || this.state.error?.toString?.()}
                  {'\n'}
                  {this.state.error?.stack}
                  {'\n'}
                  {this.state.errorInfo?.componentStack}
                  {'\n'}
                  {(() => {
                    try { return JSON.stringify(this.state.error) } catch { return '' }
                  })()}
                  {'\n'}
                  {(() => {
                    try { return JSON.stringify(this.state.errorInfo) } catch { return '' }
                  })()}
                </pre>
              </details>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleRetry}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--primary)',
                  color: 'var(--on-primary)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                <RefreshCw size={16} />
                Intentar de nuevo
              </button>
              
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'transparent',
                  color: 'var(--text)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Home size={16} />
                Recargar página
              </button>
            </div>

            {this.state.retryCount > 0 && (
              <p style={{
                fontSize: '14px',
                opacity: 0.7,
                marginTop: '16px',
                margin: '16px 0 0 0'
              }}>
                Intentos: {this.state.retryCount}
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary