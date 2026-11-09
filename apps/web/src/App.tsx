import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-navy-900 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">CertiLedger</h1>
          <nav className="flex gap-4 text-sm">
            <a href="/verify" className="hover:text-blue-300">
              Verify
            </a>
            <a href="/login" className="hover:text-blue-300">
              Login
            </a>
          </nav>
        </div>
      </header>
      <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-center text-sm text-yellow-900">
        Academic prototype. Fictional institutions and data. Not a legal verification service.
      </div>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
}

function Home() {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-navy-900 mb-4">Certificate Verification Platform</h2>
      <p className="text-text-muted mb-8 max-w-2xl mx-auto">
        Issue and verify digitally signed certificates with cryptographic proof of authenticity,
        integrity, and current status.
      </p>
      <div className="flex gap-4 justify-center">
        <a
          href="/verify"
          className="bg-navy-900 text-white px-6 py-2 rounded-lg hover:bg-navy-700 transition"
        >
          Verify a Certificate
        </a>
        <a
          href="/login"
          className="border-2 border-navy-900 text-navy-900 px-6 py-2 rounded-lg hover:bg-navy-50 transition"
        >
          Sign In
        </a>
      </div>
    </div>
  );
}

function Verify() {
  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-navy-900 mb-4">Verify Certificate</h2>
      <p className="text-text-muted">Verification page coming soon.</p>
    </div>
  );
}

function Login() {
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-navy-900 mb-4">Sign In</h2>
      <p className="text-text-muted">Login page coming soon.</p>
    </div>
  );
}

export default App;
