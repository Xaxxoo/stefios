import type { ProtocolAdapter } from './adapter';
import type { ProtocolId } from './types';

export class ProtocolRegistry {
  private readonly adapters = new Map<ProtocolId, ProtocolAdapter>();

  constructor(adapters: readonly ProtocolAdapter[] = []) {
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter: ProtocolAdapter): void {
    if (this.adapters.has(adapter.id))
      throw new Error(`Protocol adapter already registered: ${adapter.id}`);
    this.adapters.set(adapter.id, adapter);
  }

  get(id: ProtocolId): ProtocolAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`Protocol adapter not registered: ${id}`);
    return adapter;
  }

  has(id: ProtocolId): boolean {
    return this.adapters.has(id);
  }
  list(): readonly ProtocolAdapter[] {
    return [...this.adapters.values()];
  }
}
