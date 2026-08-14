import { Module } from '@nestjs/common';
import { ProtocolsModule } from '../protocols/protocols.module';
import { YieldController } from './yield.controller';

@Module({ imports: [ProtocolsModule], controllers: [YieldController] })
export class YieldModule {}
