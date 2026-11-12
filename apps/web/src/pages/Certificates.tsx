import { useState, useEffect } from 'react';
import { Eye, Download } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

interface Certificate {
  id: string;
  holderName: string;
  qualification: string;
  grade?: string;
  status: 'PENDING' | 'ISSUED' | 'REVOKED' | 'FAILED';
  issuedAt?: string;
  expiresAt?: string;
  institutionId: string;
  institutionName: string;
}

export function Certificates() {
  useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    // Mock data - replace with real API call
    const mockData: Certificate[] = [
      {
        id: 'CERT-7F92A1',
        holderName: 'John Doe',
        qualification: 'Bachelor of Science in Computer Science',
        grade: 'A',
        status: 'ISSUED',
        issuedAt: '2026-01-15T00:00:00Z',
        expiresAt: '2027-01-15T00:00:00Z',
        institutionId: 'INST-001',
        institutionName: 'University of CertiLedger',
      },
      {
        id: 'CERT-3K8L2M',
        holderName: 'Jane Smith',
        qualification: 'Master of Business Administration',
        grade: 'B+',
        status: 'ISSUED',
        issuedAt: '2026-02-20T00:00:00Z',
        expiresAt: '2028-02-20T00:00:00Z',
        institutionId: 'INST-001',
        institutionName: 'University of CertiLedger',
      },
      {
        id: 'CERT-9P1Q4R',
        holderName: 'Bob Wilson',
        qualification: 'Certificate in Data Science',
        grade: 'A-',
        status: 'REVOKED',
        issuedAt: '2026-03-10T00:00:00Z',
        expiresAt: '2027-03-10T00:00:00Z',
        institutionId: 'INST-002',
        institutionName: 'CertiLedger Institute of Technology',
      },
      {
        id: 'CERT-5T6Y7U',
        holderName: 'Alice Brown',
        qualification: 'Bachelor of Arts in Economics',
        status: 'PENDING',
        issuedAt: undefined,
        expiresAt: undefined,
        institutionId: 'INST-001',
        institutionName: 'University of CertiLedger',
      },
    ];
    setCertificates(mockData);
    setIsLoading(false);
  }, []);

  const filteredCerts = certificates.filter((cert) => {
    const matchesSearch =
      cert.id.toLowerCase().includes(search.toLowerCase()) ||
      cert.holderName.toLowerCase().includes(search.toLowerCase()) ||
      cert.qualification.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || cert.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusVariant = (status: Certificate['status']) => {
    switch (status) {
      case 'ISSUED':
        return 'issued';
      case 'REVOKED':
        return 'revoked';
      case 'PENDING':
        return 'pending';
      case 'FAILED':
        return 'failed';
    }
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const columns = [
    {
      key: 'id',
      header: 'Certificate ID',
      render: (row: Certificate) => <span className="font-mono">{row.id}</span>,
    },
    { key: 'holderName', header: 'Holder', render: (row: Certificate) => row.holderName },
    {
      key: 'qualification',
      header: 'Qualification',
      render: (row: Certificate) => row.qualification,
    },
    {
      key: 'institutionName',
      header: 'Institution',
      render: (row: Certificate) => row.institutionName,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Certificate) => (
        <Badge variant={statusVariant(row.status)}>
          {isExpired(row.expiresAt) && row.status === 'ISSUED' ? 'EXPIRED' : row.status}
        </Badge>
      ),
    },
    {
      key: 'issuedAt',
      header: 'Issued',
      render: (row: Certificate) =>
        row.issuedAt ? new Date(row.issuedAt).toLocaleDateString() : '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Certificate) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCert(row);
              setShowDetail(true);
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {row.status === 'ISSUED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                /* download */
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Certificates</h1>
          <p className="text-text-muted">Manage and view issued certificates</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search certificates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 max-w-md"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'ISSUED', label: 'Issued' },
                { value: 'REVOKED', label: 'Revoked' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'FAILED', label: 'Failed' },
              ]}
              className="w-40"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-text-muted">Loading...</div>
          ) : (
            <Table
              columns={columns}
              data={filteredCerts}
              keyExtractor={(row) => row.id}
              emptyMessage="No certificates found"
            />
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Certificate Details"
        size="lg"
      >
        {selectedCert && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-muted">Certificate ID</p>
                <p className="font-mono text-text">{selectedCert.id}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Status</p>
                <Badge variant={statusVariant(selectedCert.status)}>
                  {isExpired(selectedCert.expiresAt) && selectedCert.status === 'ISSUED'
                    ? 'EXPIRED'
                    : selectedCert.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-text-muted">Holder Name</p>
                <p className="text-text">{selectedCert.holderName}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Qualification</p>
                <p className="text-text">{selectedCert.qualification}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Grade</p>
                <p className="text-text">{selectedCert.grade || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Institution</p>
                <p className="text-text">{selectedCert.institutionName}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Issued</p>
                <p className="text-text">
                  {selectedCert.issuedAt
                    ? new Date(selectedCert.issuedAt).toLocaleDateString()
                    : 'Not yet issued'}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Expires</p>
                <p className="text-text">
                  {selectedCert.expiresAt
                    ? new Date(selectedCert.expiresAt).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowDetail(false)}>
                Close
              </Button>
              {selectedCert.status === 'ISSUED' && (
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
