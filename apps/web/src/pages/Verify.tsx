import { useState, useRef } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Shield,
  Upload,
  Search,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

type VerificationResult = {
  status:
    | 'VALID'
    | 'NOT_FOUND'
    | 'DOCUMENT_MISMATCH'
    | 'SIGNATURE_INVALID'
    | 'ISSUER_UNTRUSTED'
    | 'REVOKED'
    | 'EXPIRED'
    | 'UNAVAILABLE';
  checks: Array<{
    name: string;
    passed: boolean | null;
    reason: string;
  }>;
  certificate?: {
    id: string;
    issuer: string;
    issuedAt: string;
    expiresAt: string | null;
    keyId: string;
  };
};

type BadgeVariant =
  | 'valid'
  | 'notfound'
  | 'mismatch'
  | 'siginvalid'
  | 'untrusted'
  | 'revoked'
  | 'expired'
  | 'unavailable';

const statusConfig: Record<
  VerificationResult['status'],
  { icon: React.ReactNode; label: string; description: string; variant: BadgeVariant }
> = {
  VALID: {
    icon: <CheckCircle className="w-6 h-6" />,
    label: 'VALID',
    description: 'This document matches the registered certificate and is currently valid.',
    variant: 'valid',
  },
  NOT_FOUND: {
    icon: <Search className="w-6 h-6" />,
    label: 'NOT FOUND',
    description: 'No matching certificate was found.',
    variant: 'notfound',
  },
  DOCUMENT_MISMATCH: {
    icon: <FileText className="w-6 h-6" />,
    label: 'DOCUMENT MISMATCH',
    description: "The uploaded file doesn't match the issued document.",
    variant: 'mismatch',
  },
  SIGNATURE_INVALID: {
    icon: <Shield className="w-6 h-6" />,
    label: 'SIGNATURE INVALID',
    description: "The digital signature couldn't be verified.",
    variant: 'siginvalid',
  },
  ISSUER_UNTRUSTED: {
    icon: <AlertCircle className="w-6 h-6" />,
    label: 'ISSUER UNTRUSTED',
    description: "The issuing institution or signing key isn't trusted.",
    variant: 'untrusted',
  },
  REVOKED: {
    icon: <XCircle className="w-6 h-6" />,
    label: 'REVOKED',
    description: 'This certificate has been revoked.',
    variant: 'revoked',
  },
  EXPIRED: {
    icon: <Clock className="w-6 h-6" />,
    label: 'EXPIRED',
    description: 'This certificate has expired.',
    variant: 'expired',
  },
  UNAVAILABLE: {
    icon: <AlertCircle className="w-6 h-6" />,
    label: 'UNAVAILABLE',
    description: 'Verification is temporarily unavailable. No conclusion can be drawn.',
    variant: 'unavailable',
  },
};

export function Verify() {
  const [certificateId, setCertificateId] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVerifyById = async () => {
    if (!certificateId.trim()) return;
    setIsLoading(true);
    setError(undefined);
    setResult(null);
    try {
      // For now, simulate
      setResult({
        status: 'VALID',
        checks: [
          { name: 'Certificate found on ledger', passed: true, reason: 'Found' },
          { name: 'Issuer and signing key trusted', passed: true, reason: 'Trusted' },
          {
            name: 'Document hash matches',
            passed: null,
            reason: 'Not checked: upload the PDF to verify',
          },
          {
            name: 'Digital signature valid',
            passed: null,
            reason: 'Not checked: upload the PDF to verify',
          },
          { name: 'Not revoked', passed: true, reason: 'Active' },
          { name: 'Not expired', passed: true, reason: 'Valid until 2027-01-01' },
        ],
        certificate: {
          id: certificateId,
          issuer: 'University of CertiLedger',
          issuedAt: '2026-01-15T00:00:00Z',
          expiresAt: '2027-01-15T00:00:00Z',
          keyId: 'INST-001-KEY-01',
        },
      });
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyByFile = async () => {
    if (!pdfFile || !certificateId.trim()) return;
    setIsLoading(true);
    setError(undefined);
    setResult(null);
    try {
      // Simulate file verification
      setResult({
        status: 'VALID',
        checks: [
          { name: 'Certificate found on ledger', passed: true, reason: 'Found' },
          { name: 'Issuer and signing key trusted', passed: true, reason: 'Trusted' },
          { name: 'Document hash matches', passed: true, reason: 'Hash matches' },
          { name: 'Digital signature valid', passed: true, reason: 'Signature valid' },
          { name: 'Not revoked', passed: true, reason: 'Active' },
          { name: 'Not expired', passed: true, reason: 'Valid until 2027-01-01' },
        ],
        certificate: {
          id: certificateId,
          issuer: 'University of CertiLedger',
          issuedAt: '2026-01-15T00:00:00Z',
          expiresAt: '2027-01-15T00:00:00Z',
          keyId: 'INST-001-KEY-01',
        },
      });
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  };

  const config = result ? statusConfig[result.status] : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">Verify Certificate</h1>
        <p className="text-text-muted">
          Enter a Certificate ID and optionally upload the PDF to verify its authenticity
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Verification Input</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Input
              label="Certificate ID"
              placeholder="e.g., CERT-7F92A1"
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value.toUpperCase())}
              error={error}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Upload PDF (optional)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                pdfFile ? 'border-green-500 bg-green-50' : 'border-border hover:border-blue-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-blue-500');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-blue-500');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-blue-500');
                const file = e.dataTransfer.files[0];
                if (file && file.type === 'application/pdf') setPdfFile(file);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                {pdfFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-10 h-10 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-text">{pdfFile.name}</p>
                      <p className="text-sm text-text-muted">
                        {(pdfFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                      }}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-10 h-10 text-text-muted" />
                    <p className="text-text-muted">Click or drag a PDF file here</p>
                    <p className="text-xs text-text-muted">Max 10MB</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              onClick={handleVerifyById}
              disabled={isLoading || !certificateId.trim()}
              loading={isLoading}
              className="flex-1"
            >
              <Search className="w-4 h-4 mr-2" />
              Verify by ID
            </Button>
            <Button
              onClick={handleVerifyByFile}
              disabled={isLoading || !certificateId.trim() || !pdfFile}
              loading={isLoading}
              variant="secondary"
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              Verify with PDF
            </Button>
          </div>

          {error && (
            <div
              className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && config && (
        <Card
          className="mt-6"
          style={{ borderColor: config.variant.includes('valid') ? 'green' : 'red' }}
        >
          <CardHeader
            className={`border-${config.variant.includes('valid') ? 'green' : 'red'}-200`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`p-2 rounded-lg ${config.variant.includes('valid') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {config.icon}
              </span>
              <div>
                <Badge variant={config.variant as any} className="text-lg px-3 py-1">
                  {config.label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-muted">{config.description}</p>

            {result.certificate && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-text">Certificate Details</h4>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <dt className="text-text-muted">Certificate ID</dt>
                  <dd className="font-mono text-text">{result.certificate.id}</dd>
                  <dt className="text-text-muted">Issuer</dt>
                  <dd className="text-text">{result.certificate.issuer}</dd>
                  <dt className="text-text-muted">Key ID</dt>
                  <dd className="font-mono text-text">{result.certificate.keyId}</dd>
                  <dt className="text-text-muted">Issued</dt>
                  <dd className="text-text">
                    {new Date(result.certificate.issuedAt).toLocaleDateString()}
                  </dd>
                  <dt className="text-text-muted">Expires</dt>
                  <dd className="text-text">
                    {result.certificate.expiresAt
                      ? new Date(result.certificate.expiresAt).toLocaleDateString()
                      : 'Never'}
                  </dd>
                </dl>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-text mb-3">Verification Checks</h4>
              <div className="space-y-2">
                {result.checks.map((check, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {check.passed === true ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : check.passed === false ? (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text">{check.name}</p>
                      <p className="text-xs text-text-muted">{check.reason}</p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        check.passed === true
                          ? 'bg-green-100 text-green-700'
                          : check.passed === false
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {check.passed === true
                        ? 'Passed'
                        : check.passed === false
                          ? 'Failed'
                          : 'Skipped'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
