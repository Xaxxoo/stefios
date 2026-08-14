import 'reflect-metadata';
import { DataSource } from 'typeorm';

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test')
  throw new Error('DATABASE_URL is required for migrations');

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/entities/*{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
