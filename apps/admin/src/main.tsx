import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ApiError } from '@oggaq/api-client';
import { App } from './App';
import { Notifications } from './ui';
import './styles.css';

const cache = new QueryClient({ defaultOptions: {
  queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: (count, error) => count < 1 && error instanceof ApiError && (error.status === 0 || error.status >= 500) },
  mutations: { retry: false },
} });
const router = createBrowserRouter([{ path: '*', element: <App /> }]);

createRoot(document.getElementById('root')!).render(<StrictMode><QueryClientProvider client={cache}><Notifications><RouterProvider router={router} /></Notifications></QueryClientProvider></StrictMode>);
