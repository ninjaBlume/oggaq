import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@oggaq/api-client';
import { App } from './App';
import { SessionEvents } from './auth';
import './styles.css';

const cache = new QueryClient({ defaultOptions: {
  queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: (count, error) => count < 1 && error instanceof ApiError && (error.status === 0 || error.status >= 500) },
  mutations: { retry: false },
} });
const router = createBrowserRouter([{ path: '*', element: <App /> }]);
createRoot(document.getElementById('root')!).render(<StrictMode><QueryClientProvider client={cache}><SessionEvents><RouterProvider router={router} /></SessionEvents></QueryClientProvider></StrictMode>);
