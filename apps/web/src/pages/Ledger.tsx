import { useState, useEffect } from 'react';
import { RefreshCw, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table } from '../components/ui/Table';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

interface LedgerEntry {
  seq: number;
  type: string;
  subjectId: string;
  payload: any;
  prevHash: string;
  entryHash: string;
  at: string;
}

export function Ledger() {
  useAuth();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const mockData: LedgerEntry[] = [
      {
        seq: 1,
        type: 'ISSUER_REGISTERED',
        subjectId: 'INST-001',
        payload: { name: 'University of CertiLedger' },
        prevHash: '0'.repeat(64),
        entryHash: 'a1b2c3d4e5f6...',
        at: '2026-01-15T10:00:00Z',
      },
      {
        seq: 2,
        type: 'KEY_REGISTERED',
        subjectId: 'INST-001-KEY-01',
        payload: { institutionId: 'INST-001', keyId: 'INST-001-KEY-01' },
        prevHash: 'a1b2c3d4e5f6...',
        entryHash: 'f6e5d4c3b2a1...',
        at: '2026-01-15T10:05:00Z',
      },
      {
        seq: 3,
        type: 'ISSUER_REGISTERED',
        subjectId: 'INST-002',
        payload: { name: 'CertiLedger Institute of Technology' },
        prevHash: 'f6e5d4c3b2a1...',
        entryHash: '9f8e7d6c5b4a...',
        at: '2026-01-15T10:10:00Z',
      },
      {
        seq: 4,
        type: 'KEY_REGISTERED',
        subjectId: 'INST-002-KEY-01',
        payload: { institutionId: 'INST-002', keyId: 'INST-002-KEY-01' },
        prevHash: '9f8e7d6c5b4a...',
        entryHash: '3c2b1a0f9e8d...',
        at: '2026-01-15T10:15:00Z',
      },
      {
        seq: 5,
        type: 'ISSUED',
        subjectId: 'CERT-7F92A1',
        payload: {
          institutionId: 'INST-001',
          holderName: 'John Doe',
          documentHash: 'sha256:abc123...',
        },
        prevHash: '3c2b1a0f9e8d...',
        entryHash: '7d6e5f4a3b2c...',
        at: '2026-02-20T14:30:00Z',
      },
      {
        seq: 6,
        type: 'ISSUED',
        subjectId: 'CERT-3K8L2M',
        payload: {
          institutionId: 'INST-001',
          holderName: 'Jane Smith',
          documentHash: 'sha256:def456...',
        },
        prevHash: '7d6e5f4a3b2c...',
        entryHash: '1a0f9e8d7c6b...',
        at: '2026-03-10T09:15:00Z',
      },
      {
        seq: 7,
        type: 'REVOKED',
        subjectId: 'CERT-9P1Q4R',
        payload: { institutionId: 'INST-002', reasonCode: 'FRAUD' },
        prevHash: '1a0f9e8d7c6b...',
        entryHash: '5b4a3c2d1e0f...',
        at: '2026-04-01T11:00:00Z',
      },
    ];
    setEntries(mockData);
    setIsLoading(false);
  }, []);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.subjectId.toLowerCase().includes(search.toLowerCase()) ||
      entry.type.toLowerCase().includes(search.toLowerCase()) ||
      entry.entryHash.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || entry.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredEntries.length / pageSize);

  const verifyChain = async () => {
    setVerifying(true);
    // Simulate chain verification
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setChainValid(true);
    setVerifying(false);
  };

  const typeColors: Record<string, string> = {
    ISSUER_REGISTERED: 'bg-blue-100 text-blue-800',
    KEY_REGISTERED: 'bg-green-100 text-green-800',
    ISSUED: 'bg-purple-100 text-purple-800',
    REVOKED: 'bg-red-100 text-red-800',
    ISSUER_STATUS_CHANGED: 'bg-yellow-100 text-yellow-800',
    KEY_STATUS_CHANGED: 'bg-orange-100 text-orange-800',
  };

  const columns = [
    {
      key: 'seq',
      header: 'Seq',
      render: (row: LedgerEntry) => <span className="font-mono text-sm">{row.seq}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: LedgerEntry) => (
        <Badge variant="default" className={typeColors[row.type] || 'bg-gray-100 text-gray-800'}>
          {row.type}
        </Badge>
      ),
    },
    {
      key: 'subjectId',
      header: 'Subject ID',
      render: (row: LedgerEntry) => <span className="font-mono text-sm">{row.subjectId}</span>,
    },
    {
      key: 'entryHash',
      header: 'Entry Hash',
      render: (row: LedgerEntry) => (
        <span className="font-mono text-sm">{row.entryHash.substring(0, 16)}...</span>
      ),
    },
    {
      key: 'prevHash',
      header: 'Prev Hash',
      render: (row: LedgerEntry) => (
        <span className="font-mono text-sm">{row.prevHash.substring(0, 16)}...</span>
      ),
    },
    {
      key: 'at',
      header: 'Timestamp',
      render: (row: LedgerEntry) => new Date(row.at).toLocaleString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: LedgerEntry) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedEntry(row);
            setShowDetail(true);
          }}
        >
          <Hash className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Ledger Explorer</h1>
          <p className="text-text-muted">View and verify ledger entries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={verifyChain} loading={verifying}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Verify Chain
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Input
          placeholder="Search entries..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="flex-1 max-w-md"
        />
        <Select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          options={[
            { value: '', label: 'All Types' },
            { value: 'ISSUER_REGISTERED', label: 'Issuer Registered' },
            { value: 'KEY_REGISTERED', label: 'Key Registered' },
            { value: 'ISSUED', label: 'Certificate Issued' },
            { value: 'REVOKED', label: 'Certificate Revoked' },
            { value: 'ISSUER_STATUS_CHANGED', label: 'Issuer Status Changed' },
            { value: 'KEY_STATUS_CHANGED', label: 'Key Status Changed' },
          ]}
          className="w-48"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-lg font-semibold">Ledger Entries</h2>
          {chainValid !== null && (
            <Badge variant={chainValid ? 'valid' : 'revoked'} className="text-sm">
              {chainValid ? 'Chain Valid' : 'Chain Invalid'}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-text-muted">Loading...</div>
          ) : (
            <>
              <Table
                columns={columns}
                data={paginatedEntries}
                keyExtractor={(row) => row.seq.toString()}
                emptyMessage="No entries found"
              />
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-text-muted">
                    Page {currentPage} of {totalPages} • {filteredEntries.length} entries
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Entry Details"
        size="lg"
      >
        {selectedEntry && (
          <div className="space-y-4 font-mono text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-text-muted">Sequence</p>
                <p>{selectedEntry.seq}</p>
              </div>
              <div>
                <p className="text-text-muted">Type</p>
                <p>{selectedEntry.type}</p>
              </div>
              <div>
                <p className="text-text-muted">Subject ID</p>
                <p>{selectedEntry.subjectId}</p>
              </div>
              <div>
                <p className="text-text-muted">Timestamp</p>
                <p>{new Date(selectedEntry.at).toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-text-muted">Entry Hash</p>
                <p>{selectedEntry.entryHash}</p>
              </div>
              <div className="col-span-2">
                <p className="text-text-muted">Previous Hash</p>
                <p>{selectedEntry.prevHash}</p>
              </div>
              <div className="col-span-2">
                <p className="text-text-muted">Payload</p>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(selectedEntry.payload, null, 2)}
                </pre>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowDetail(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
