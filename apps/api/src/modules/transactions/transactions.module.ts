import { Module } from '@nestjs/common';
import { ProtocolsModule } from '../protocols/protocols.module';
import { ActivityModule } from '../activity/activity.module';
import { SwapController, TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [ProtocolsModule, ActivityModule],
  controllers: [TransactionsController, SwapController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
