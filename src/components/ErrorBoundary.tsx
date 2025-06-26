import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Envoyer l'erreur à un service de monitoring si nécessaire
    if (window.location.hostname !== 'localhost') {
      // En production, on pourrait envoyer l'erreur à un service comme Sentry
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Oups ! Une erreur est survenue
              </h1>
              <p className="text-gray-600 mb-6">
                Nous sommes désolés, mais quelque chose s'est mal passé. 
                Veuillez actualiser la page ou réessayer plus tard.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left bg-gray-100 p-4 rounded-md mb-4">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    Détails de l'erreur (développement)
                  </summary>
                  <pre className="mt-2 text-sm text-red-600 whitespace-pre-wrap">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Actualiser la page
                </button>
                
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: undefined });
                  }}
                  className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Réessayer
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full text-blue-600 py-2 px-4 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook pour gérer les erreurs dans les composants fonctionnels
export const useErrorHandler = () => {
  const handleError = (error: Error, errorInfo?: string) => {
    console.error('Error caught by useErrorHandler:', error);
    
    // En production, envoyer l'erreur à un service de monitoring
    if (window.location.hostname !== 'localhost') {
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        info: errorInfo
      });
    }
  };

  return { handleError };
};

export default ErrorBoundary;
