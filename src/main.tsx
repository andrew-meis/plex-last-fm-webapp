import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.tsx';
import Dashboard from './components/dashboard/Dashboard.tsx';
import Inspect from './components/inspect/Inspect.tsx';
import Match from './components/match/Match.tsx';
import Settings from './components/settings/Settings.tsx';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <Dashboard title="Dashboard" />,
      },
      {
        path: '/match',
        element: <Match title="Match" />,
      },
      {
        path: '/inspect',
        element: <Inspect title="Inspect" />,
      },
      {
        path: '/settings',
        element: <Settings title="Settings" />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </LocalizationProvider>
  </React.StrictMode>,
);
