import { useState } from 'react';
import { Calculator, Zap, RefreshCw, BookOpen, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Table } from '../components/ui/Table';

type LabTool =
  | 'gcd'
  | 'extendedGcd'
  | 'modInverse'
  | 'totient'
  | 'modExp'
  | 'isPrimeTrial'
  | 'millerRabin'
  | 'toyRsaGenerate'
  | 'toyRsaSign'
  | 'toyRsaVerify'
  | 'checkEuler'
  | 'checkFermat';

const toolConfigs: Record<
  LabTool,
  {
    label: string;
    description: string;
    fields: { key: string; label: string; type: 'text' | 'number' }[];
  }
> = {
  gcd: {
    label: 'GCD (Euclidean Algorithm)',
    description: 'Compute greatest common divisor with step-by-step table',
    fields: [
      { key: 'a', label: 'a', type: 'text' },
      { key: 'b', label: 'b', type: 'text' },
    ],
  },
  extendedGcd: {
    label: 'Extended GCD (Bézout)',
    description: 'Find Bézout coefficients x, y such that ax + by = gcd(a,b)',
    fields: [
      { key: 'a', label: 'a', type: 'text' },
      { key: 'b', label: 'b', type: 'text' },
    ],
  },
  modInverse: {
    label: 'Modular Inverse',
    description: 'Find x such that ax ≡ 1 (mod m)',
    fields: [
      { key: 'a', label: 'a', type: 'text' },
      { key: 'm', label: 'm (modulus)', type: 'text' },
    ],
  },
  totient: {
    label: "Euler's Totient φ(n)",
    description: 'Count integers up to n coprime to n',
    fields: [{ key: 'n', label: 'n', type: 'text' }],
  },
  modExp: {
    label: 'Fast Modular Exponentiation',
    description: 'Compute b^e mod m using repeated squaring with step table',
    fields: [
      { key: 'base', label: 'base', type: 'text' },
      { key: 'exp', label: 'exponent', type: 'text' },
      { key: 'mod', label: 'modulus', type: 'text' },
    ],
  },
  isPrimeTrial: {
    label: 'Trial Division Primality',
    description: 'Check if n is prime using trial division',
    fields: [{ key: 'n', label: 'n', type: 'text' }],
  },
  millerRabin: {
    label: 'Miller-Rabin Primality',
    description: 'Probabilistic primality test with configurable rounds',
    fields: [
      { key: 'n', label: 'n', type: 'text' },
      { key: 'rounds', label: 'rounds (default 20)', type: 'number' },
    ],
  },
  toyRsaGenerate: {
    label: 'Toy RSA Key Generation',
    description: 'Generate toy RSA keys (p, q, e → n, φ, d)',
    fields: [
      { key: 'p', label: 'p (prime)', type: 'text' },
      { key: 'q', label: 'q (prime)', type: 'text' },
      { key: 'e', label: 'e', type: 'text' },
    ],
  },
  toyRsaSign: {
    label: 'Toy RSA Sign',
    description: 'Sign message with toy RSA (m^d mod n)',
    fields: [
      { key: 'm', label: 'message m', type: 'text' },
      { key: 'd', label: 'private exponent d', type: 'text' },
      { key: 'n', label: 'modulus n', type: 'text' },
    ],
  },
  toyRsaVerify: {
    label: 'Toy RSA Verify',
    description: 'Verify signature with toy RSA (s^e mod n)',
    fields: [
      { key: 's', label: 'signature s', type: 'text' },
      { key: 'e', label: 'public exponent e', type: 'text' },
      { key: 'n', label: 'modulus n', type: 'text' },
    ],
  },
  checkEuler: {
    label: "Euler's Theorem Check",
    description: 'Verify a^φ(n) ≡ 1 (mod n) for coprime a, n',
    fields: [
      { key: 'a', label: 'a', type: 'text' },
      { key: 'n', label: 'n', type: 'text' },
    ],
  },
  checkFermat: {
    label: "Fermat's Little Theorem Check",
    description: 'Verify a^(p-1) ≡ 1 (mod p) for prime p',
    fields: [
      { key: 'a', label: 'a', type: 'text' },
      { key: 'p', label: 'p (prime)', type: 'text' },
    ],
  },
};

export function Lab() {
  const [selectedTool, setSelectedTool] = useState<LabTool>('gcd');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompute = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSteps([]);

    try {
      let res;
      switch (selectedTool) {
        case 'gcd':
          res = await api.lab.gcd(inputs.a, inputs.b);
          break;
        case 'extendedGcd':
          res = await api.lab.extendedGcd(inputs.a, inputs.b);
          break;
        case 'modInverse':
          res = await api.lab.modInverse(inputs.a, inputs.m);
          break;
        case 'totient':
          res = await api.lab.totient(inputs.n);
          break;
        case 'modExp':
          res = await api.lab.modExp(inputs.base, inputs.exp, inputs.mod);
          break;
        case 'isPrimeTrial':
          res = await api.lab.isPrimeTrial(inputs.n);
          break;
        case 'millerRabin':
          res = await api.lab.millerRabin(inputs.n, parseInt(inputs.rounds) || 20);
          break;
        case 'toyRsaGenerate':
          res = await api.lab.toyRsaGenerate(inputs.p, inputs.q, inputs.e);
          break;
        case 'toyRsaSign':
          res = await api.lab.toyRsaSign(inputs.m, inputs.d, inputs.n);
          break;
        case 'toyRsaVerify':
          res = await api.lab.toyRsaVerify(inputs.s, inputs.e, inputs.n);
          break;
        case 'checkEuler':
          res = await api.lab.checkEuler(inputs.a, inputs.n);
          break;
        case 'checkFermat':
          res = await api.lab.checkFermat(inputs.a, inputs.p);
          break;
      }
      setResult(res.result);
      setSteps(res.steps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Computation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toolConfig = toolConfigs[selectedTool];
  const isToyRsa = selectedTool.startsWith('toyRsa');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
          <BookOpen className="w-6 h-6" />
          Number Theory Lab
        </h1>
        <p className="text-text-muted mt-1">
          Interactive algorithms with step-by-step output. All computations use BigInt for arbitrary
          precision.
        </p>
      </div>

      {isToyRsa && (
        <div
          className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Educational Only</p>
            <p className="text-sm text-red-700 mt-1">
              Toy RSA is textbook RSA without padding. It is deterministic, malleable, and insecure.
              The production system uses RSA-PSS.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-semibold">Select Algorithm</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(toolConfigs).map(([key, config]) => (
              <Button
                key={key}
                variant={selectedTool === key ? 'primary' : 'ghost'}
                className="w-full justify-start text-left gap-3"
                onClick={() => {
                  setSelectedTool(key as LabTool);
                  setInputs({});
                  setResult(null);
                  setSteps([]);
                  setError(null);
                }}
              >
                <Calculator className="w-4 h-4" />
                <div className="text-left flex-1">
                  <p className="font-medium">{config.label}</p>
                  <p className="text-xs text-text-muted">{config.description}</p>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {toolConfig.label}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInputs({});
                  setResult(null);
                  setSteps([]);
                  setError(null);
                }}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {toolConfig.fields.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  type={field.type}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  value={inputs[field.key] || ''}
                  onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                />
              ))}
            </div>

            <Button onClick={handleCompute} loading={isLoading} className="w-full sm:w-auto">
              <Zap className="w-4 h-4 mr-2" />
              Compute
            </Button>

            {error && (
              <div
                className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            {result !== null && (
              <div className="space-y-4">
                <h3 className="font-medium text-navy-900">Result</h3>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-60">
                  {JSON.stringify(
                    result,
                    (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
                    2
                  )}
                </pre>
              </div>
            )}

            {steps.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-navy-900">Step-by-Step</h3>
                <div className="overflow-auto">
                  <Table
                    columns={(() => {
                      const baseColumns = [
                        { key: 'step', header: 'Step', render: (row: any) => row.step },
                      ];
                      if (selectedTool === 'gcd' || selectedTool === 'extendedGcd') {
                        return [
                          ...baseColumns,
                          { key: 'a', header: 'a', render: (row: any) => row.a },
                          { key: 'b', header: 'b', render: (row: any) => row.b },
                          { key: 'q', header: 'q', render: (row: any) => row.q },
                          { key: 'r', header: 'r', render: (row: any) => row.r },
                        ];
                      }
                      if (selectedTool === 'modExp') {
                        return [
                          ...baseColumns,
                          { key: 'bit', header: 'Bit', render: (row: any) => row.bit },
                          { key: 'base', header: 'Base', render: (row: any) => row.base },
                          { key: 'result', header: 'Result', render: (row: any) => row.result },
                        ];
                      }
                      return [
                        ...baseColumns,
                        {
                          key: 'description',
                          header: 'Description',
                          render: (row: any) => row.description,
                        },
                        { key: 'value', header: 'Value', render: (row: any) => row.value },
                      ];
                    })()}
                    data={steps.map((s, i) => ({ step: i + 1, ...s }))}
                    keyExtractor={(s) => s.step?.toString() || Math.random().toString()}
                    emptyMessage="No steps"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
