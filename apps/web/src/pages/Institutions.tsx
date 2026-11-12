import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

interface Institution {
  id: string;
  name: string;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  keys?: { keyId: string; status: string }[];
}

export function Institutions() {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState<{ id: string; name: string }>({ id: '', name: '' });
  const [errors, setErrors] = useState<{ id?: string; name?: string }>({});

  useEffect(() => {
    const mockData: Institution[] = [
      {
        id: 'INST-001',
        name: 'University of CertiLedger',
        status: 'ACTIVE',
        createdAt: '2026-01-15T00:00:00Z',
        keys: [{ keyId: 'INST-001-KEY-01', status: 'ACTIVE' }],
      },
      {
        id: 'INST-002',
        name: 'CertiLedger Institute of Technology',
        status: 'ACTIVE',
        createdAt: '2026-01-15T00:00:00Z',
        keys: [{ keyId: 'INST-002-KEY-01', status: 'ACTIVE' }],
      },
    ];
    setInstitutions(mockData);
    setIsLoading(false);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { id?: string; name?: string } = {};
    if (!formData.id.trim()) newErrors.id = 'Institution ID is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const newInst: Institution = {
      id: formData.id,
      name: formData.name,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      keys: [],
    };
    setInstitutions([newInst, ...institutions]);
    setShowCreate(false);
    setFormData({ id: '', name: '' });
  };

  const handleStatusChange = async (inst: Institution, newStatus: 'ACTIVE' | 'DISABLED') => {
    setInstitutions(institutions.map((i) => (i.id === inst.id ? { ...i, status: newStatus } : i)));
  };

  const columns = [
    {
      key: 'id',
      header: 'Institution ID',
      render: (row: Institution) => <span className="font-mono">{row.id}</span>,
    },
    { key: 'name', header: 'Name', render: (row: Institution) => row.name },
    {
      key: 'status',
      header: 'Status',
      render: (row: Institution) => (
        <Badge variant={row.status === 'ACTIVE' ? 'active' : 'disabled'}>{row.status}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row: Institution) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'keys',
      header: 'Keys',
      render: (row: Institution) => (
        <span className="text-text-muted">{row.keys?.length || 0} keys</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Institution) => (
        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={row.status === 'ACTIVE'}
              onChange={(e) => handleStatusChange(row, e.target.checked ? 'ACTIVE' : 'DISABLED')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Institutions</h1>
          <p className="text-text-muted">Manage registered institutions</p>
        </div>
        {user?.role === 'NETWORK_ADMIN' && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Register Institution
          </Button>
        )}
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-text-muted">Loading...</div>
          ) : (
            <Table
              columns={columns}
              data={institutions}
              keyExtractor={(row) => row.id}
              emptyMessage="No institutions registered"
            />
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Register Institution"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Institution ID"
            placeholder="INST-003"
            value={formData.id}
            onChange={(e) => setFormData({ ...formData, id: e.target.value.toUpperCase() })}
            error={errors.id}
          />
          <Input
            label="Name"
            placeholder="University Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit">Register Institution</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
