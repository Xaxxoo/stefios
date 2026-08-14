import { Module } from '@nestjs/common';
import { ProtocolsModule } from '../protocols/protocols.module';
import { SwapController, TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [ProtocolsModule],
  controllers: [TransactionsController, SwapController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
