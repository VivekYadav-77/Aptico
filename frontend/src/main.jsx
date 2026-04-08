import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { setupAuthInterceptors } from './api/authApi.js';
import App from './App.jsx';
import { ThemeProvider } from './components/theme.jsx';
import './index.css';
import { store } from './store/authSlice.js';

setupAuthInterceptors(store);

const queryClient = new QueryClient();

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
