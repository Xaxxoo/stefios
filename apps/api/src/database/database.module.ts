import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('app.databaseUrl'),
        autoLoadEntities: true,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: config.get<string>('app.nodeEnv') === 'production',
        synchronize: false,
        logging: config.get<string>('app.nodeEnv') === 'development' ? ['error'] : ['error'],
      }),
    }),
  ],
})
export class DatabaseModule {}
