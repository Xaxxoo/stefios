import type { ReactNode } from 'react';
import { ApiError, NetworkError, SessionExpiredError } from '../../lib/api/errors';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="p-6 text-sm opacity-70">
      {label}
    </div>
  );
}
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <h2 className="font-medium">{title}</h2>
      {description ? <p className="mt-2 text-sm opacity-70">{description}</p> : null}
    </div>
  );
}
export function ErrorState({ error, action }: { error: unknown; action?: ReactNode }) {
  const message =
    error instanceof SessionExpiredError
      ? 'Your session has expired.'
      : error instanceof NetworkError
        ? 'Unable to reach the API.'
        : error instanceof ApiError
          ? error.message
          : 'Something went wrong.';
  return (
    <div role="alert" className="rounded-lg border border-red-300 p-6 text-sm text-red-700">
      <p>{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
