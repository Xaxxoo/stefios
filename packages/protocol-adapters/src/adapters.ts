import { BaseProtocolAdapter } from './adapter';
import type { ProtocolCapabilities, ProtocolDataSource } from './types';

export class BlendAdapter extends BaseProtocolAdapter {
  readonly id = 'blend' as const;
  readonly name = 'Blend';
  readonly capabilities: ProtocolCapabilities = BaseProtocolAdapter.capabilities(
    'supply',
    'withdraw',
    'borrow',
    'repay',
    'claim',
  );
}

export class AquariusAdapter extends BaseProtocolAdapter {
  readonly id = 'aquarius' as const;
  readonly name = 'Aquarius';
  readonly capabilities: ProtocolCapabilities = BaseProtocolAdapter.capabilities(
    'depositLiquidity',
    'withdrawLiquidity',
    'swap',
    'claim',
  );
}

export class SushiAdapter extends BaseProtocolAdapter {
  readonly id = 'sushi' as const;
  readonly name = 'Sushi';
  readonly capabilities: ProtocolCapabilities = BaseProtocolAdapter.capabilities(
    'depositLiquidity',
    'withdrawLiquidity',
    'swap',
    'claim',
  );
}

export class TemplarAdapter extends BaseProtocolAdapter {
  readonly id = 'templar' as const;
  readonly name = 'Templar';
  readonly capabilities: ProtocolCapabilities = BaseProtocolAdapter.capabilities(
    'supply',
    'withdraw',
    'borrow',
    'repay',
  );
}

export type AdapterConstructor = new (source?: ProtocolDataSource) => BaseProtocolAdapter;
