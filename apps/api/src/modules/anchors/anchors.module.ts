import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anchor, AnchorTransaction } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { AnchorsController } from './anchors.controller';
import { HttpAnchorAdapter } from './anchor-adapter';
import { AnchorsService } from './anchors.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Anchor, AnchorTransaction])],
  controllers: [AnchorsController],
  providers: [
    AnchorsService,
    {
      provide: 'ANCHOR_ADAPTER',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new HttpAnchorAdapter({
          timeoutMs: Number(config.get('app.anchorRequestTimeoutMs', 8_000)),
          allowHttp: config.get('app.nodeEnv') !== 'production',
        }),
    },
  ],
  exports: [AnchorsService],
})
export class AnchorsModule {}
