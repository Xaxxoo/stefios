export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export class NetworkError extends Error {
  constructor(message = 'The network is unavailable') {
    super(message);
    this.name = 'NetworkError';
  }
}
export class SessionExpiredError extends ApiError {
  constructor() {
    super(401, 'Your session has expired');
    this.name = 'SessionExpiredError';
  }
}
