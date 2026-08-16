/**
 * Market Data Errors
 * Standardized error types for market data providers
 */

export abstract class MarketDataError extends Error {
  abstract readonly code: string;
  abstract readonly retryable: boolean;

  constructor(
    message: string,
    public readonly symbol?: string,
    public readonly timeframe?: string,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'MarketDataError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ProviderError extends MarketDataError {
  readonly code = 'PROVIDER_ERROR';
  readonly retryable = true;

  constructor(message: string, symbol?: string, timeframe?: string, provider?: string) {
    super(message, symbol, timeframe, provider);
    this.name = 'ProviderError';
  }
}

export class RateLimitError extends MarketDataError {
  readonly code = 'RATE_LIMIT';
  readonly retryable = true;
  readonly retryAfterMs: number | undefined;

  constructor(
    message: string,
    retryAfterMs?: number,
    symbol?: string,
    timeframe?: string,
    provider?: string
  ) {
    super(message, symbol, timeframe, provider);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs ?? undefined;
  }
}

export class SymbolNotFoundError extends MarketDataError {
  readonly code = 'SYMBOL_NOT_FOUND';
  readonly retryable = false;

  constructor(symbol: string, provider?: string) {
    super(`Symbol not found: ${symbol}`, symbol, undefined, provider);
    this.name = 'SymbolNotFoundError';
  }
}

export class InsufficientDataError extends MarketDataError {
  readonly code = 'INSUFFICIENT_DATA';
  readonly retryable = false;
  readonly required: number;
  readonly available: number;

  constructor(
    required: number,
    available: number,
    symbol?: string,
    timeframe?: string,
    provider?: string
  ) {
    super(
      `Insufficient data: required ${required} candles, available ${available}`,
      symbol,
      timeframe,
      provider
    );
    this.name = 'InsufficientDataError';
    this.required = required;
    this.available = available;
  }
}

export class DataValidationError extends MarketDataError {
  readonly code = 'DATA_VALIDATION';
  readonly retryable = false;
  readonly validationErrors: string[];

  constructor(errors: string[], symbol?: string, timeframe?: string, provider?: string) {
    super(`Data validation failed: ${errors.join(', ')}`, symbol, timeframe, provider);
    this.name = 'DataValidationError';
    this.validationErrors = errors;
  }
}

export class NetworkError extends MarketDataError {
  readonly code = 'NETWORK_ERROR';
  readonly retryable = true;
  readonly statusCode: number | undefined;

  constructor(
    message: string,
    statusCode?: number,
    symbol?: string,
    timeframe?: string,
    provider?: string
  ) {
    super(message, symbol, timeframe, provider);
    this.name = 'NetworkError';
    this.statusCode = statusCode ?? undefined;
  }
}

export class ConfigurationError extends MarketDataError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly retryable = false;

  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// Error factory for creating appropriate error from HTTP response
export function createErrorFromResponse(
  response: Response,
  symbol?: string,
  timeframe?: string,
  provider?: string
): MarketDataError {
  switch (response.status) {
    case 404:
      return new SymbolNotFoundError(symbol || 'unknown', provider);
    case 429:
      const retryAfter = response.headers.get('retry-after');
      return new RateLimitError(
        'Rate limit exceeded',
        retryAfter ? Number(retryAfter) * 1000 : undefined,
        symbol,
        timeframe,
        provider
      );
    case 500:
    case 502:
    case 503:
    case 504:
      return new NetworkError(
        `Server error: ${response.status}`,
        response.status,
        symbol,
        timeframe,
        provider
      );
    default:
      return new ProviderError(
        `HTTP ${response.status}: ${response.statusText}`,
        symbol,
        timeframe,
        provider
      );
  }
}

// Type guard for retryable errors
export function isRetryableError(error: unknown): error is MarketDataError & { retryable: true } {
  return error instanceof MarketDataError && error.retryable;
}
