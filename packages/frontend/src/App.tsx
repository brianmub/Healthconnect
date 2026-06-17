import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';

// Page Imports
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Templates from './pages/Templates';
import Appointments from './pages/Appointments';
import Automation from './pages/Automation';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Providers from './pages/Providers';

// Layout Imports
import AppLayout from './components/layout/AppLayout';

// Query Client setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ==========================================
// 1. Error Boundary Component
// ==========================================
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PageErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught page error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="bg-danger-500/10 text-danger-500 border border-danger-500/20 p-4 rounded-xl max-w-md">
            <h3 className="text-base font-bold mb-2">Something went wrong</h3>
            <p className="text-xs text-slate-400 mb-4">
              An unexpected error occurred while loading this page.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.location.reload()}
              className="w-full text-xs font-semibold"
            >
              Retry Loading Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Inline fallback button definition for ErrorBoundary render
function Button({ children, variant = 'primary', size = 'sm', className = '', ...props }: any) {
  return (
    <button
      className={`inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 transition-all ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ==========================================
// 2. Route Guarding Components
// ==========================================
function ProtectedRoute() {
  const token = useAuthStore((state) => state.accessToken);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <PageErrorBoundary>
        <Outlet />
      </PageErrorBoundary>
    </AppLayout>
  );
}

function PublicOnlyRoute() {
  const token = useAuthStore((state) => state.accessToken);

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

// ==========================================
// 3. Main Application Component
// ==========================================
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Protected Area Workspace */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/campaigns/:id" element={<CampaignDetail />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/providers" element={<Providers />} />
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      
      {/* Toast notifications handler */}
      <Toaster position="top-right" theme="dark" richColors />
    </QueryClientProvider>
  );
}
