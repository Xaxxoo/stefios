import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertRule, Notification } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { AlertsController } from './alerts.controller';
import { AlertsProcessor } from './alerts.processor';
import { AlertsService } from './alerts.service';
import { ALERT_QUEUE } from './alerts.types';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([AlertRule, Notification]),
    BullModule.registerQueue({ name: ALERT_QUEUE }),
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsProcessor],
})
export class AlertsModule {}
