import { IsIn, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

const stellarAddress = /^G[A-Z2-7]{55}$/;

export class CreateChallengeDto {
  @IsString() @Matches(stellarAddress) accountAddress!: string;
  @IsIn(['testnet', 'mainnet']) network!: 'testnet' | 'mainnet';
  @IsString() @IsNotEmpty() @Length(1, 255) domain!: string;
}

export class VerifyChallengeDto {
  @IsString() @IsNotEmpty() challengeId!: string;
  @IsString() @IsNotEmpty() @Length(1, 8192) signature!: string;
  @IsString() @Matches(stellarAddress) accountAddress!: string;
  @IsIn(['testnet', 'mainnet']) network!: 'testnet' | 'mainnet';
  @IsString() @IsNotEmpty() @Length(1, 255) domain!: string;
}
