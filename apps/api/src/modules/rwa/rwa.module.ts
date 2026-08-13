import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset, RwaMetadata } from '../../database/entities/assets.entity';
import { RwaController } from './rwa.controller';
import { RwaService } from './rwa.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, RwaMetadata])],
  controllers: [RwaController],
  providers: [RwaService],
})
export class RwaModule {}
