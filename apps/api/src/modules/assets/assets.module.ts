import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset, AssetIssuer, AssetMetadata } from '../../database/entities';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, AssetIssuer, AssetMetadata])],
  controllers: [AssetsController],
  providers: [AssetsService],
})
export class AssetsModule {}
