import Decimal from 'decimal.js';

export type DecimalInput = Decimal.Value;
export type DecimalResult = string;

const decimal = (value: DecimalInput): Decimal => new Decimal(value);
const result = (value: Decimal): DecimalResult => value.toFixed();

export const addition = (...values: DecimalInput[]): DecimalResult =>
  result(values.reduce<Decimal>((total, value) => total.plus(decimal(value)), new Decimal(0)));
export const subtraction = (value: DecimalInput, ...subtrahends: DecimalInput[]): DecimalResult =>
  result(
    subtrahends.reduce<Decimal>(
      (total, subtrahend) => total.minus(decimal(subtrahend)),
      decimal(value),
    ),
  );
export const multiplication = (...values: DecimalInput[]): DecimalResult =>
  result(values.reduce<Decimal>((total, value) => total.times(decimal(value)), new Decimal(1)));
export const division = (dividend: DecimalInput, divisor: DecimalInput): DecimalResult =>
  result(decimal(dividend).div(decimal(divisor)));
export const percentageChange = (oldValue: DecimalInput, newValue: DecimalInput): DecimalResult =>
  result(
    decimal(oldValue).isZero()
      ? new Decimal(0)
      : decimal(newValue).minus(decimal(oldValue)).div(decimal(oldValue)).times(100),
  );

export interface WeightedRate {
  rate: DecimalInput;
  weight: DecimalInput;
}
export const weightedApy = (rates: readonly WeightedRate[]): DecimalResult => {
  const totalWeight = rates.reduce<Decimal>(
    (total, item) => total.plus(decimal(item.weight)),
    new Decimal(0),
  );
  if (totalWeight.isZero()) return '0';
  return result(
    rates
      .reduce<Decimal>(
        (total, item) => total.plus(decimal(item.rate).times(decimal(item.weight))),
        new Decimal(0),
      )
      .div(totalWeight),
  );
};

export const portfolioWeight = (
  positionValue: DecimalInput,
  totalPortfolioValue: DecimalInput,
): DecimalResult => {
  const total = decimal(totalPortfolioValue);
  return result(total.isZero() ? new Decimal(0) : decimal(positionValue).div(total).times(100));
};

export const priceConversion = (amount: DecimalInput, price: DecimalInput): DecimalResult =>
  result(decimal(amount).times(decimal(price)));
export const slippage = (
  expectedPrice: DecimalInput,
  executionPrice: DecimalInput,
): DecimalResult =>
  result(
    decimal(expectedPrice).isZero()
      ? new Decimal(0)
      : decimal(expectedPrice)
          .minus(decimal(executionPrice))
          .div(decimal(expectedPrice))
          .times(100),
  );
export const minimumReceived = (
  expectedAmount: DecimalInput,
  slippagePercent: DecimalInput,
): DecimalResult =>
  result(decimal(expectedAmount).times(new Decimal(1).minus(decimal(slippagePercent).div(100))));
export const loanToValue = (
  debtValue: DecimalInput,
  collateralValue: DecimalInput,
): DecimalResult =>
  result(
    decimal(collateralValue).isZero()
      ? new Decimal(0)
      : decimal(debtValue).div(decimal(collateralValue)).times(100),
  );
export const healthRatio = (
  collateralValue: DecimalInput,
  liquidationThreshold: DecimalInput,
  debtValue: DecimalInput,
): DecimalResult =>
  result(
    decimal(debtValue).isZero()
      ? new Decimal(0)
      : decimal(collateralValue)
          .times(decimal(liquidationThreshold))
          .div(100)
          .div(decimal(debtValue)),
  );

export { Decimal };
