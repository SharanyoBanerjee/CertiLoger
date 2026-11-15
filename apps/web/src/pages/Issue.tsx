import { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

interface FormData {
  institutionId: string;
  holderName: string;
  qualification: string;
  grade: string;
  expiresAt: string;
}

const institutions = [
  { value: 'INST-001', label: 'University of CertiLedger' },
  { value: 'INST-002', label: 'CertiLedger Institute of Technology' },
];

export function Issue() {
  const { user, accessToken } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    institutionId: user?.institutionId || '',
    holderName: '',
    qualification: '',
    grade: '',
    expiresAt: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    pdfUrl?: string;
    certId?: string;
    error?: string;
  } | null>(null);

  const validate = () => {
    const newErrors: Partial<FormData> = {};
    if (!formData.holderName.trim()) newErrors.holderName = 'Holder name is required';
    if (!formData.qualification.trim()) newErrors.qualification = 'Qualification is required';
    if (!formData.institutionId) newErrors.institutionId = 'Institution is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const token = accessToken || localStorage.getItem('accessToken') || '';
      const pdfBlob = await api.certificates.issue(formData, token);
      const url = URL.createObjectURL(pdfBlob);
      const certId = `CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setResult({ success: true, pdfUrl: url, certId });
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to issue certificate',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Issue Certificate</h1>
        <p className="text-text-muted">Fill in the details to issue a new certificate</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Certificate Details</h2>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Institution"
              value={formData.institutionId}
              onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
              options={institutions}
              error={errors.institutionId}
              disabled={!!user?.institutionId}
            />

            <Input
              label="Holder Name"
              placeholder="John Doe"
              value={formData.holderName}
              onChange={(e) => setFormData({ ...formData, holderName: e.target.value })}
              error={errors.holderName}
            />

            <Input
              label="Qualification"
              placeholder="Bachelor of Science in Computer Science"
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              error={errors.qualification}
            />

            <Input
              label="Grade (optional)"
              placeholder="A+"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            />

            <Input
              label="Expiry Date (optional)"
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            />

            <Button type="submit" className="w-full" loading={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Issue Certificate
            </Button>
          </form>

          {result && (
            <div
              className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
            >
              {result.success ? (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Certificate issued successfully!</p>
                    <p className="text-sm text-green-700">
                      Certificate ID: <span className="font-mono">{result.certId}</span>
                    </p>
                    {result.pdfUrl && (
                      <a
                        href={result.pdfUrl}
                        download={`certificate-${result.certId}.pdf`}
                        className="inline-flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <p className="text-red-800">{result.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
