import { Module } from '@nestjs/common';
import { PricesController } from './prices.controller';
import { PricesService, PRICE_PROVIDERS } from './prices.service';
import { ConfiguredStablecoinPriceProvider } from './stablecoin-provider';

@Module({
  controllers: [PricesController],
  providers: [
    ConfiguredStablecoinPriceProvider,
    {
      provide: PRICE_PROVIDERS,
      inject: [ConfiguredStablecoinPriceProvider],
      useFactory: (stablecoin: ConfiguredStablecoinPriceProvider) => [stablecoin],
    },
    PricesService,
  ],
  exports: [PricesService],
})
export class PricesModule {}
