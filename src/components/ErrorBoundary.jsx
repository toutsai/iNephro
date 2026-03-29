import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          background: '#f9f9f9',
          borderRadius: '8px',
          margin: '10px'
        }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>
            系統發生錯誤，請重新整理頁面
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            重新整理
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
