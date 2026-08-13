import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Keypair } from '@stellar/stellar-sdk';
import type { Repository } from 'typeorm';
import { AuthChallenge } from '../../database/entities/auth-challenge.entity';
import { Session, User } from '../../database/entities/identity.entity';
import type { CreateChallengeDto, VerifyChallengeDto } from './dto/auth.dto';
import { isSessionActive } from './auth-verifier';

export const AUTH_SESSION_COOKIE = 'sfo_session';
export const AUTH_CSRF_COOKIE = 'sfo_csrf';

export interface AuthSession {
  id: string;
  userId: string;
  accountAddress: string;
  network: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();
  private readonly challengeTtlMs: number;
  private readonly sessionTtlMs: number;

  constructor(
    @InjectRepository(AuthChallenge) private readonly challenges: Repository<AuthChallenge>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {
    this.challengeTtlMs = Number(this.config.get('app.authChallengeTtlSeconds', 300)) * 1000;
    this.sessionTtlMs = Number(this.config.get('app.authSessionTtlSeconds', 86400)) * 1000;
  }

  async createChallenge(dto: CreateChallengeDto) {
    this.checkRateLimit(`challenge:${dto.accountAddress}`);
    const nonce = randomBytes(32).toString('base64url');
    const challenge = this.challenges.create({
      accountAddress: dto.accountAddress,
      network: dto.network,
      domain: dto.domain,
      nonceHash: this.hash(nonce),
      nonce,
      expiresAt: new Date(Date.now() + this.challengeTtlMs),
      consumedAt: null,
    });
    const saved = await this.challenges.save(challenge);
    return {
      challengeId: saved.id,
      nonce,
      expiresAt: saved.expiresAt,
      domain: dto.domain,
      network: dto.network,
      message: this.message(saved.id, nonce, dto),
    };
  }

  async verifyChallenge(
    dto: VerifyChallengeDto,
  ): Promise<{ session: AuthSession; csrfToken: string; sessionToken: string }> {
    this.checkRateLimit(`verify:${dto.accountAddress}`);
    const challenge = await this.challenges.findOne({ where: { id: dto.challengeId } });
    if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() <= Date.now())
      throw new UnauthorizedException('Challenge is invalid, expired, or already used');
    if (
      challenge.accountAddress !== dto.accountAddress ||
      challenge.network !== dto.network ||
      challenge.domain !== dto.domain
    )
      throw new UnauthorizedException('Challenge binding mismatch');
    const message = this.message(challenge.id, challenge.nonce, dto);
    if (!this.verifySignature(dto.accountAddress, message, dto.signature))
      throw new UnauthorizedException('Invalid wallet signature');
    challenge.consumedAt = new Date();
    await this.challenges.save(challenge);
    let user = await this.users.findOne({ where: { externalId: dto.accountAddress } });
    if (!user)
      user = await this.users.save(
        this.users.create({
          externalId: dto.accountAddress,
          status: 'active',
          email: null,
          metadata: null,
        }),
      );
    const sessionToken = randomUUID() + randomBytes(32).toString('hex');
    const session = await this.sessions.save(
      this.sessions.create({
        userId: user.id,
        tokenHash: this.hash(sessionToken),
        network: dto.network,
        expiresAt: new Date(Date.now() + this.sessionTtlMs),
        revokedAt: null,
      }),
    );
    return {
      session: {
        id: session.id,
        userId: user.id,
        accountAddress: dto.accountAddress,
        network: dto.network,
        expiresAt: session.expiresAt,
      },
      csrfToken: randomBytes(32).toString('base64url'),
      sessionToken,
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      await this.sessions.save(session);
    }
  }

  async getSession(sessionId: string): Promise<AuthSession | null> {
    const session = await this.sessions.findOne({ where: { id: sessionId } });
    if (!session || !isSessionActive(session)) return null;
    const user = await this.users.findOne({ where: { id: session.userId } });
    if (!user) return null;
    return {
      id: session.id,
      userId: user.id,
      accountAddress: user.externalId,
      network: session.network,
      expiresAt: session.expiresAt,
    };
  }

  async getSessionByToken(token: string): Promise<AuthSession | null> {
    const session = await this.sessions.findOne({ where: { tokenHash: this.hash(token) } });
    return session ? this.getSession(session.id) : null;
  }

  async listSessions(userId: string) {
    const sessions = await this.sessions.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      network: session.network,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
    }));
  }

  private message(challengeId: string, nonce: string, dto: CreateChallengeDto): string {
    return `Stellar Financial OS login\nDomain: ${dto.domain}\nNetwork: ${dto.network}\nChallenge: ${challengeId}\nNonce: ${nonce}`;
  }
  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
  private checkRateLimit(key: string): void {
    const now = Date.now();
    const current = this.attempts.get(key);
    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + 60_000 });
      return;
    }
    if (current.count >= 10) throw new UnauthorizedException('Too many authentication attempts');
    current.count += 1;
  }
  private verifySignature(accountAddress: string, message: string, signature: string): boolean {
    try {
      return Keypair.fromPublicKey(accountAddress).verify(
        Buffer.from(message, 'utf8'),
        Buffer.from(signature, 'base64'),
      );
    } catch {
      return false;
    }
  }
}
