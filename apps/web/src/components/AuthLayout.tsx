import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Shield, Key, FileText, Database, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PrototypeBanner } from './PrototypeBanner';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Shield,
    roles: ['NETWORK_ADMIN', 'INSTITUTION_ADMIN', 'ISSUER', 'HOLDER', 'AUDITOR'],
  },
  { name: 'Issue', href: '/issue', icon: FileText, roles: ['ISSUER', 'INSTITUTION_ADMIN'] },
  {
    name: 'Certificates',
    href: '/certificates',
    icon: FileText,
    roles: ['ISSUER', 'INSTITUTION_ADMIN', 'HOLDER', 'AUDITOR'],
  },
  { name: 'Keys', href: '/keys', icon: Key, roles: ['INSTITUTION_ADMIN', 'NETWORK_ADMIN'] },
  { name: 'Institutions', href: '/institutions', icon: Shield, roles: ['NETWORK_ADMIN'] },
  {
    name: 'Ledger',
    href: '/ledger',
    icon: Database,
    roles: ['AUDITOR', 'NETWORK_ADMIN', 'INSTITUTION_ADMIN'],
  },
  {
    name: 'Lab',
    href: '/lab',
    icon: BookOpen,
    roles: ['NETWORK_ADMIN', 'INSTITUTION_ADMIN', 'ISSUER', 'HOLDER', 'AUDITOR'],
  },
];

export function AuthLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navigation.filter((item) => item.roles.includes(user?.role || ''));

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-navy-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <NavLink
                to="/dashboard"
                className="text-xl font-bold hover:opacity-80 transition-opacity"
              >
                CertiLedger
              </NavLink>
              <nav className="hidden md:flex items-center gap-1">
                {filteredNav.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-navy-700 text-white'
                          : 'text-gray-300 hover:bg-navy-700 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm text-gray-300">{user?.name}</span>
              <Badge
                variant={(user?.role?.toLowerCase() as any) || 'default'}
                className="hidden sm:inline-flex"
              >
                {user?.role}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-navy-700"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <PrototypeBanner />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
