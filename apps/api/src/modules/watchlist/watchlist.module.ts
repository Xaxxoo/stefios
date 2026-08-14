import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WatchlistItem } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([WatchlistItem])],
  controllers: [WatchlistController],
  providers: [WatchlistService],
})
export class WatchlistModule {}
