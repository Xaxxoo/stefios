import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Keypair } from '@stellar/stellar-sdk';
import {
  challengeMessage,
  isSessionActive,
  validateChallenge,
  verifyWalletSignature,
} from '../src/modules/auth/auth-verifier';

describe('wallet authentication', () => {
  it('accepts a valid signature', () => {
    const wallet = Keypair.random();
    const challenge = {
      id: 'c',
      nonce: 'n',
      accountAddress: wallet.publicKey(),
      domain: 'app.example.com',
      network: 'testnet' as const,
      expiresAt: new Date(Date.now() + 30000),
      consumedAt: null,
    };
    const message = challengeMessage(challenge, challenge);
    assert.equal(validateChallenge(challenge, challenge), 'valid');
    assert.equal(
      verifyWalletSignature(
        wallet.publicKey(),
        message,
        wallet.sign(Buffer.from(message)).toString('base64'),
      ),
      true,
    );
  });
  it('rejects bad signatures and wrong accounts', () => {
    const wallet = Keypair.random();
    const other = Keypair.random();
    const message = 'login';
    const signature = wallet.sign(Buffer.from(message)).toString('base64');
    assert.equal(verifyWalletSignature(wallet.publicKey(), 'tampered', signature), false);
    assert.equal(verifyWalletSignature(other.publicKey(), message, signature), false);
  });
  it('rejects expired, replayed, wrong-network, and wrong-domain challenges', () => {
    const wallet = Keypair.random();
    const challenge: {
      id: string;
      nonce: string;
      accountAddress: string;
      domain: string;
      network: 'testnet';
      expiresAt: Date;
      consumedAt: Date | null;
    } = {
      id: 'c',
      nonce: 'n',
      accountAddress: wallet.publicKey(),
      domain: 'app.example.com',
      network: 'testnet' as const,
      expiresAt: new Date(Date.now() - 1),
      consumedAt: null,
    };
    assert.equal(validateChallenge(challenge, challenge), 'expired');
    challenge.expiresAt = new Date(Date.now() + 30000);
    challenge.consumedAt = new Date();
    assert.equal(validateChallenge(challenge, challenge), 'replayed');
    challenge.consumedAt = null;
    assert.equal(
      validateChallenge(challenge, { ...challenge, network: 'mainnet' }),
      'binding_mismatch',
    );
    assert.equal(
      validateChallenge(challenge, { ...challenge, domain: 'evil.example.com' }),
      'binding_mismatch',
    );
  });
  it('rejects revoked sessions', () => {
    assert.equal(
      isSessionActive({ expiresAt: new Date(Date.now() + 30000), revokedAt: new Date() }),
      false,
    );
  });
});
