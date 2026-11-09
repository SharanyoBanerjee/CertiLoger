// Crypto package - real SHA-256 and RSA-PSS will be added in commit 8
// Wraps node:crypto only. Never imports number-theory.

export function sha256(_data: Buffer): string {
  throw new Error('Not implemented - commit 8');
}

export async function sha256Stream(_stream: NodeJS.ReadableStream): Promise<string> {
  throw new Error('Not implemented - commit 8');
}

export function generateKeyPair(): { privateKeyPem: string; publicKeyPem: string } {
  throw new Error('Not implemented - commit 8');
}

export function sign(_data: Buffer, _privateKeyPem: string): string {
  throw new Error('Not implemented - commit 8');
}

export function verify(_data: Buffer, _signature: string, _publicKeyPem: string): boolean {
  throw new Error('Not implemented - commit 8');
}

export function loadPrivateKey(_keyId: string): string {
  throw new Error('Not implemented - commit 8');
}
