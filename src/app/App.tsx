import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ConfirmProvider } from '../shared/ui/ConfirmProvider';
import { ToastProvider } from '../shared/ui/ToastProvider';
import { AuthProvider } from './auth/AuthProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { AppRoutes } from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
  },
});

/** Подпуть хостинга (GitHub Pages: /mrgn-board/) — тот же, что base у Vite, без хвостового слеша. */
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '');

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <BrowserRouter basename={BASENAME}>
                <AppRoutes />
              </BrowserRouter>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
