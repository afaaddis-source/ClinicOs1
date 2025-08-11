import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from './language-provider';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  language: 'ar' | 'en';
  t: (key: string) => string;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Auto-recovery attempt after 10 seconds
    this.resetTimeoutId = window.setTimeout(() => {
      this.handleReset();
    }, 10000);
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  handleReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <ErrorBoundaryWrapper>
          <FallbackComponent
            error={this.state.error!}
            resetError={this.handleReset}
          />
        </ErrorBoundaryWrapper>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to provide context
const ErrorBoundaryWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="error-boundary-wrapper">
      {children}
    </div>
  );
};

// Default error fallback component
const DefaultErrorFallback: React.FC<Omit<ErrorFallbackProps, 'language' | 't'>> = ({ 
  error, 
  resetError 
}) => {
  const { language, t } = useLanguage();

  const getErrorMessage = (error: Error): string => {
    // Check for common error types and provide friendly messages
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return t('error.chunk_load_error');
    }
    
    if (error.message.includes('Network')) {
      return t('error.network_error');
    }
    
    if (error.message.includes('CSRF')) {
      return t('error.csrf_message');
    }
    
    if (error.name === 'TypeError') {
      return t('error.type_error');
    }
    
    return t('error.generic_error');
  };

  const isRTL = language === 'ar';

  return (
    <div 
      className={`error-boundary min-h-screen bg-background flex items-center justify-center p-4`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-destructive">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-foreground">
            {t('error.something_went_wrong')}
          </h1>
          
          <div className="text-muted-foreground space-y-2">
            <p>{getErrorMessage(error)}</p>
            <details className="text-sm">
              <summary className="cursor-pointer hover:text-foreground">
                {t('error.technical_details')}
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-md text-left text-xs overflow-auto">
                {error.stack || error.message}
              </pre>
            </details>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={resetError}
            variant="default"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {t('common.try_again')}
          </Button>
          
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            {t('common.reload_page')}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {t('error.auto_recovery_message')}
        </div>
      </div>
    </div>
  );
};

// Hook for handling async errors in components
export const useErrorHandler = () => {
  const [, setState] = React.useState();
  
  return React.useCallback((error: Error) => {
    setState(() => {
      throw error;
    });
  }, []);
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;

// Add error messages to localization files
export const errorMessages = {
  ar: {
    error: {
      something_went_wrong: 'حدث خطأ غير متوقع',
      chunk_load_error: 'فشل في تحميل جزء من التطبيق. يرجى إعادة تحميل الصفحة.',
      network_error: 'خطأ في الشبكة. يرجى التحقق من اتصال الإنترنت.',
      type_error: 'خطأ في النوع. يرجى المحاولة مرة أخرى.',
      technical_details: 'التفاصيل التقنية',
      auto_recovery_message: 'سيتم إعادة المحاولة تلقائياً خلال 10 ثواني...'
    },
    common: {
      try_again: 'حاول مرة أخرى',
      reload_page: 'إعادة تحميل الصفحة'
    }
  },
  en: {
    error: {
      something_went_wrong: 'Something went wrong',
      chunk_load_error: 'Failed to load part of the application. Please reload the page.',
      network_error: 'Network error. Please check your internet connection.',
      type_error: 'Type error occurred. Please try again.',
      technical_details: 'Technical Details',
      auto_recovery_message: 'Auto-recovery will attempt in 10 seconds...'
    },
    common: {
      try_again: 'Try Again',
      reload_page: 'Reload Page'
    }
  }
};