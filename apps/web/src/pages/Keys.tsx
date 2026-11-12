import { useState, useEffect } from 'react';
import { Plus, Edit } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';

interface Key {
  keyId: string;
  institutionId: string;
  institutionName: string;
  publicKeyPem: string;
  status: 'ACTIVE' | 'RETIRED' | 'COMPROMISED';
  validFrom: string;
}

export function Keys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<Key[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showStatus, setShowStatus] = useState<Key | null>(null);
  const [formData, setFormData] = useState<{
    institutionId: string;
    keyId: string;
    publicKeyPem: string;
  }>({
    institutionId: user?.institutionId || '',
    keyId: '',
    publicKeyPem: '',
  });
  const [statusForm, setStatusForm] = useState<{ status: 'ACTIVE' | 'RETIRED' | 'COMPROMISED' }>({
    status: 'ACTIVE',
  });
  const [errors, setErrors] = useState<{
    institutionId?: string;
    keyId?: string;
    publicKeyPem?: string;
  }>({});

  useEffect(() => {
    const mockData: Key[] = [
      {
        keyId: 'INST-001-KEY-01',
        institutionId: 'INST-001',
        institutionName: 'University of CertiLedger',
        publicKeyPem:
          '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn0y3...\n-----END PUBLIC KEY-----',
        status: 'ACTIVE',
        validFrom: '2026-01-15T00:00:00Z',
      },
      {
        keyId: 'INST-001-KEY-02',
        institutionId: 'INST-001',
        institutionName: 'University of CertiLedger',
        publicKeyPem:
          '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn0y3...\n-----END PUBLIC KEY-----',
        status: 'RETIRED',
        validFrom: '2025-06-01T00:00:00Z',
      },
      {
        keyId: 'INST-002-KEY-01',
        institutionId: 'INST-002',
        institutionName: 'CertiLedger Institute of Technology',
        publicKeyPem:
          '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn0y3...\n-----END PUBLIC KEY-----',
        status: 'ACTIVE',
        validFrom: '2026-01-15T00:00:00Z',
      },
    ];
    setKeys(mockData);
    setIsLoading(false);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { institutionId?: string; keyId?: string; publicKeyPem?: string } = {};
    if (!formData.keyId.trim()) newErrors.keyId = 'Key ID is required';
    if (!formData.publicKeyPem.trim()) newErrors.publicKeyPem = 'Public key is required';
    if (!formData.institutionId) newErrors.institutionId = 'Institution is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Simulate API call
    const newKey: Key = {
      keyId: formData.keyId,
      institutionId: formData.institutionId,
      institutionName:
        formData.institutionId === 'INST-001'
          ? 'University of CertiLedger'
          : 'CertiLedger Institute of Technology',
      publicKeyPem: formData.publicKeyPem,
      status: 'ACTIVE',
      validFrom: new Date().toISOString(),
    };
    setKeys([newKey, ...keys]);
    setShowRegister(false);
    setFormData({ institutionId: user?.institutionId || '', keyId: '', publicKeyPem: '' });
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStatus) return;
    const updatedKeys = keys.map((k) =>
      k.keyId === showStatus.keyId ? { ...k, status: statusForm.status } : k
    );
    setKeys(updatedKeys);
    setShowStatus(null);
  };

  const statusVariant = (status: Key['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'active';
      case 'RETIRED':
        return 'retired';
      case 'COMPROMISED':
        return 'compromised';
    }
  };

  const columns = [
    {
      key: 'keyId',
      header: 'Key ID',
      render: (row: Key) => <span className="font-mono">{row.keyId}</span>,
    },
    { key: 'institutionName', header: 'Institution', render: (row: Key) => row.institutionName },
    {
      key: 'status',
      header: 'Status',
      render: (row: Key) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
    },
    {
      key: 'validFrom',
      header: 'Registered',
      render: (row: Key) => new Date(row.validFrom).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Key) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowStatus(row);
              setStatusForm({ status: row.status });
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Signing Keys</h1>
          <p className="text-text-muted">Manage institution signing keys</p>
        </div>
        <Button onClick={() => setShowRegister(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Register Key
        </Button>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-text-muted">Loading...</div>
          ) : (
            <Table
              columns={columns}
              data={keys}
              keyExtractor={(row) => row.keyId}
              emptyMessage="No keys registered"
            />
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        title="Register Signing Key"
        size="lg"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <Select
            label="Institution"
            value={formData.institutionId}
            onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
            options={[
              { value: 'INST-001', label: 'University of CertiLedger' },
              { value: 'INST-002', label: 'CertiLedger Institute of Technology' },
            ]}
            error={errors.institutionId}
            disabled={!!user?.institutionId}
          />
          <Input
            label="Key ID"
            placeholder="INST-001-KEY-02"
            value={formData.keyId}
            onChange={(e) => setFormData({ ...formData, keyId: e.target.value })}
            error={errors.keyId}
          />
          <Textarea
            label="Public Key (PEM format)"
            placeholder="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn0y3...\n-----END PUBLIC KEY-----"
            value={formData.publicKeyPem}
            onChange={(e) => setFormData({ ...formData, publicKeyPem: e.target.value })}
            error={errors.publicKeyPem}
            rows={8}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setShowRegister(false)}>
              Cancel
            </Button>
            <Button type="submit">Register Key</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!showStatus}
        onClose={() => setShowStatus(null)}
        title="Update Key Status"
        size="sm"
      >
        <form onSubmit={handleStatusChange} className="space-y-4">
          <p className="text-sm text-text-muted">
            Updating status for <span className="font-mono text-text">{showStatus?.keyId}</span>
          </p>
          <Select
            label="New Status"
            value={statusForm.status}
            onChange={(e) => setStatusForm({ status: e.target.value as any })}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'RETIRED', label: 'Retired' },
              { value: 'COMPROMISED', label: 'Compromised' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setShowStatus(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={statusForm.status === 'COMPROMISED' ? 'danger' : 'primary'}
            >
              Update Status
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
