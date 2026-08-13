import { Module } from '@nestjs/common';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './infrastructure/redis.module';
import { JobsModule } from './infrastructure/jobs.module';
import { HealthModule } from './health/health.module';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { StellarModule } from './modules/stellar/stellar.module';
import { AssetsModule } from './modules/assets/assets.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { PricesModule } from './modules/prices/prices.module';
import { ProtocolsModule } from './modules/protocols/protocols.module';
import { ActivityModule } from './modules/activity/activity.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AnchorsModule } from './modules/anchors/anchors.module';
import { CrossChainModule } from './modules/cross-chain/cross-chain.module';
import { RiskModule } from './modules/risk/risk.module';
import { YieldModule } from './modules/yield/yield.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    RedisModule,
    JobsModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WalletsModule,
    StellarModule,
    AssetsModule,
    PortfolioModule,
    PricesModule,
    ProtocolsModule,
    ActivityModule,
    TransactionsModule,
    PaymentsModule,
    AnchorsModule,
    CrossChainModule,
    RiskModule,
    YieldModule,
    NotificationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
