import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Verify } from './pages/Verify';
import { AuthLayout } from './components/AuthLayout';
import { Dashboard } from './pages/Dashboard';
import { Issue } from './pages/Issue';
import { Certificates } from './pages/Certificates';
import { Keys } from './pages/Keys';
import { Institutions } from './pages/Institutions';
import { Ledger } from './pages/Ledger';
import { Lab } from './pages/Lab';
import { PrototypeBanner } from './components/PrototypeBanner';
import './index.css';

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-navy-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-xl font-bold">
              CertiLedger
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/verify" className="text-gray-300 hover:text-white transition-colors">
                Verify
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-navy-700 transition-colors"
              >
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <PrototypeBanner />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/verify"
        element={
          <PublicLayout>
            <Verify />
          </PublicLayout>
        }
      />
      <Route
        path="/login"
        element={
          <PublicLayout>
            <Login />
          </PublicLayout>
        }
      />

      <Route element={<AuthLayout />}>
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/issue"
          element={
            <PrivateRoute>
              <Issue />
            </PrivateRoute>
          }
        />
        <Route
          path="/certificates"
          element={
            <PrivateRoute>
              <Certificates />
            </PrivateRoute>
          }
        />
        <Route
          path="/keys"
          element={
            <PrivateRoute>
              <Keys />
            </PrivateRoute>
          }
        />
        <Route
          path="/institutions"
          element={
            <PrivateRoute>
              <Institutions />
            </PrivateRoute>
          }
        />
        <Route
          path="/ledger"
          element={
            <PrivateRoute>
              <Ledger />
            </PrivateRoute>
          }
        />
        <Route
          path="/lab"
          element={
            <PrivateRoute>
              <Lab />
            </PrivateRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
