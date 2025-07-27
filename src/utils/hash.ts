import crypto from 'crypto';

export function calculateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}