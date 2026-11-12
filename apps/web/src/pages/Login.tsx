import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const testAccounts = [
    { email: 'netadmin@certiledger.test', role: 'Network Admin' },
    { email: 'instadmin@univ.test', role: 'Institution Admin (Univ)' },
    { email: 'instadmin@tech.test', role: 'Institution Admin (Tech)' },
    { email: 'issuer@univ.test', role: 'Issuer (Univ)' },
    { email: 'issuer@tech.test', role: 'Issuer (Tech)' },
    { email: 'holder@test.test', role: 'Holder' },
    { email: 'auditor@test.test', role: 'Auditor' },
  ];

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Sign In</h1>
          <p className="text-text-muted">Enter your credentials to access CertiLedger</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Credentials</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Input
                label="Email"
                type="email"
                placeholder="you@institution.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <Button type="submit" className="w-full" loading={isLoading}>
                <Shield className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-text mb-3">
            Test Accounts (password: password123)
          </h3>
          <div className="space-y-1 text-xs text-text-muted">
            {testAccounts.map((acc) => (
              <div key={acc.email} className="flex justify-between">
                <span>{acc.email}</span>
                <Badge variant="default" className="text-xs">
                  {acc.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
