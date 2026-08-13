import { Keypair } from '@stellar/stellar-sdk';

export interface ChallengeRecord {
  id: string;
  accountAddress: string;
  network: 'testnet' | 'mainnet';
  domain: string;
  nonce: string;
  expiresAt: Date;
  consumedAt: Date | null;
}
export function challengeMessage(
  challenge: Pick<ChallengeRecord, 'id' | 'nonce'>,
  binding: Pick<ChallengeRecord, 'domain' | 'network'>,
): string {
  return `Stellar Financial OS login\nDomain: ${binding.domain}\nNetwork: ${binding.network}\nChallenge: ${challenge.id}\nNonce: ${challenge.nonce}`;
}
export function verifyWalletSignature(
  accountAddress: string,
  message: string,
  signature: string,
): boolean {
  try {
    return Keypair.fromPublicKey(accountAddress).verify(
      Buffer.from(message),
      Buffer.from(signature, 'base64'),
    );
  } catch {
    return false;
  }
}
export function validateChallenge(
  challenge: ChallengeRecord | null,
  binding: Pick<ChallengeRecord, 'accountAddress' | 'domain' | 'network'>,
): 'valid' | 'expired' | 'replayed' | 'binding_mismatch' {
  if (!challenge) return 'expired';
  if (challenge.consumedAt) return 'replayed';
  if (challenge.expiresAt.getTime() <= Date.now()) return 'expired';
  if (
    challenge.accountAddress !== binding.accountAddress ||
    challenge.domain !== binding.domain ||
    challenge.network !== binding.network
  )
    return 'binding_mismatch';
  return 'valid';
}
export function isSessionActive(session: { expiresAt: Date; revokedAt: Date | null }): boolean {
  return !session.revokedAt && session.expiresAt.getTime() > Date.now();
}
