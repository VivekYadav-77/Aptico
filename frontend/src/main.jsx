import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { setupAuthInterceptors } from './api/authApi.js';
import App from './App.jsx';
import { ThemeProvider } from './components/theme.jsx';
import './index.css';
import { store } from './store/authSlice.js';
import { CACHE_TIMES } from './constants/index.js';

setupAuthInterceptors(store);

// ── TanStack Query — Global cache defaults ───────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TIMES.DEFAULT,       // 1 minute default
      gcTime: 10 * 60 * 1000,              // 10 minute garbage collection
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </QueryClientProvider>
);
