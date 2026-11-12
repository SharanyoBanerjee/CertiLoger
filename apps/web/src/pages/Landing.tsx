import { Link } from 'react-router-dom';
import { Shield, FileCheck, Search, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function Landing() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-navy-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <span className="text-xl font-bold">CertiLedger</span>
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

      <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-center text-sm text-yellow-900">
        Academic prototype. Fictional institutions and data. Not a legal verification service.
      </div>

      <main className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-navy-900 mb-6 leading-tight">
            Certificate Verification Platform
          </h1>
          <p className="text-lg text-text-muted mb-10 max-w-2xl mx-auto">
            Issue and verify digitally signed certificates with cryptographic proof of authenticity,
            integrity, and current status.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/verify">
              <Button size="lg" className="w-full sm:w-auto">
                <Search className="w-5 h-5 mr-2" />
                Verify a Certificate
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                <Shield className="w-5 h-5 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6 bg-surface rounded-lg border border-border">
            <div className="w-12 h-12 mx-auto mb-4 bg-navy-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-navy-900" />
            </div>
            <h3 className="text-xl font-semibold text-navy-900 mb-2">Authentic Issuers</h3>
            <p className="text-text-muted">
              Only registered institutions with verified keys can issue certificates.
            </p>
          </div>
          <div className="text-center p-6 bg-surface rounded-lg border border-border">
            <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-lg flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-green-700" />
            </div>
            <h3 className="text-xl font-semibold text-navy-900 mb-2">Tamper-Proof</h3>
            <p className="text-text-muted">
              SHA-256 hash and RSA-PSS signature detect any modification to the PDF.
            </p>
          </div>
          <div className="text-center p-6 bg-surface rounded-lg border border-border">
            <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-lg flex items-center justify-center">
              <Search className="w-6 h-6 text-blue-700" />
            </div>
            <h3 className="text-xl font-semibold text-navy-900 mb-2">Instant Verification</h3>
            <p className="text-text-muted">
              Anyone can verify a certificate by ID or QR code in seconds.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link
            to="/verify"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            How verification works
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
