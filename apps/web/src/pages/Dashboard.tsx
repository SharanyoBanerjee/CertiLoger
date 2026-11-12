import { Shield, FileText, Key, TrendingUp, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const statCards = [
  {
    title: 'Certificates Issued',
    value: '1,234',
    change: '+12%',
    Icon: FileText,
    color: 'text-blue-600 bg-blue-100',
    href: '/certificates',
  },
  {
    title: 'Active Institutions',
    value: '2',
    change: '0%',
    Icon: Building2,
    color: 'text-green-600 bg-green-100',
    href: '/institutions',
  },
  {
    title: 'Signing Keys',
    value: '3',
    change: '+1',
    Icon: Key,
    color: 'text-purple-600 bg-purple-100',
    href: '/keys',
  },
  {
    title: 'Verification Requests',
    value: '5,678',
    change: '+8%',
    Icon: Shield,
    color: 'text-orange-600 bg-orange-100',
    href: '/verify',
  },
];

const roleActions: Record<string, { label: string; href: string; Icon: typeof Shield }[]> = {
  NETWORK_ADMIN: [
    { label: 'Register Institution', href: '/institutions/new', Icon: Building2 },
    { label: 'View All Keys', href: '/keys', Icon: Key },
  ],
  INSTITUTION_ADMIN: [
    { label: 'Register Key', href: '/keys/new', Icon: Key },
    { label: 'Manage Keys', href: '/keys', Icon: Key },
  ],
  ISSUER: [
    { label: 'Issue Certificate', href: '/issue', Icon: FileText },
    { label: 'My Certificates', href: '/certificates', Icon: FileText },
  ],
  HOLDER: [
    { label: 'My Certificates', href: '/certificates', Icon: FileText },
    { label: 'Verify Certificate', href: '/verify', Icon: Shield },
  ],
  AUDITOR: [
    { label: 'Ledger Explorer', href: '/ledger', Icon: TrendingUp },
    { label: 'View Certificates', href: '/certificates', Icon: FileText },
  ],
};

export function Dashboard() {
  const { user } = useAuth();
  const actions = roleActions[user?.role || ''] || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
          <p className="text-text-muted">Welcome back, {user?.name}</p>
        </div>
        <div className="flex gap-2">
          {actions.map((action, i) => (
            <Link key={i} to={action.href}>
              <Button variant="secondary">
                <action.Icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Link key={i} to={stat.href} className="hover:opacity-80 transition-opacity">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-muted">{stat.title}</p>
                    <p className="text-3xl font-bold text-navy-900 mt-1">{stat.value}</p>
                    <p className="text-sm text-green-600 mt-1">{stat.change} vs last month</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Issue Certificate',
                href: '/issue',
                Icon: FileText,
                desc: 'Create and sign a new certificate',
                roles: ['ISSUER', 'INSTITUTION_ADMIN'],
              },
              {
                label: 'Verify Certificate',
                href: '/verify',
                Icon: Shield,
                desc: 'Check a certificate by ID or PDF',
                roles: ['ISSUER', 'INSTITUTION_ADMIN', 'HOLDER', 'AUDITOR', 'NETWORK_ADMIN'],
              },
              {
                label: 'Manage Keys',
                href: '/keys',
                Icon: Key,
                desc: 'Register or update signing keys',
                roles: ['INSTITUTION_ADMIN', 'NETWORK_ADMIN'],
              },
              {
                label: 'View Certificates',
                href: '/certificates',
                Icon: FileText,
                desc: 'Browse issued certificates',
                roles: ['ISSUER', 'INSTITUTION_ADMIN', 'HOLDER', 'AUDITOR'],
              },
            ]
              .filter((a) => a.roles.includes(user?.role || ''))
              .map((action, i) => (
                <Link key={i} to={action.href}>
                  <Button
                    variant="secondary"
                    className="w-full justify-start h-auto p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-navy-100 rounded-lg">
                        <action.Icon className="w-5 h-5 text-navy-900" />
                      </div>
                      <div>
                        <p className="font-medium text-navy-900">{action.label}</p>
                        <p className="text-sm text-text-muted">{action.desc}</p>
                      </div>
                    </div>
                  </Button>
                </Link>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
