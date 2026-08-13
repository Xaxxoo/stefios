import { ConsoleLogger } from '@nestjs/common';

export class StructuredLogger extends ConsoleLogger {
  override log(message: unknown, context?: string): void {
    super.log(
      JSON.stringify({ level: 'info', message, context, timestamp: new Date().toISOString() }),
    );
  }
}
