import { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { captureError } from '../../utils/sentry';
import styles from '../../styles/components/ErrorBoundary.module.css';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Default error UI; also used by the route-level ErrorBoundary in root.tsx. */
export const ErrorFallback = () => {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h2 className={styles.title}>{t('errors.title')}</h2>
        <p className={styles.message}>{t('errors.message')}</p>
        <button
          type='button'
          className={styles.refreshBtn}
          onClick={() => window.location.reload()}
        >
          {t('errors.refresh')}
        </button>
      </div>
    </div>
  );
};

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    captureError(error);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
