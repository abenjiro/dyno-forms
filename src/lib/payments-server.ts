import crypto from 'node:crypto';

const UNLOCK_SECRET = process.env.JWT_SECRET || 'dyno-forms-prepaid-unlock-key-2026';

export function createPrepaidUnlockToken(formId: string, paymentId: string): string {
  const payload = `${formId}:${paymentId}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', UNLOCK_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
}

export function verifyPrepaidUnlockToken(formId: string, token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [tokenFormId, paymentId, timestamp, signature] = decoded.split(':');
    if (tokenFormId !== formId) return false;
    const expectedSig = crypto
      .createHmac('sha256', UNLOCK_SECRET)
      .update(`${tokenFormId}:${paymentId}:${timestamp}`)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch {
    return false;
  }
}
