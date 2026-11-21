/**
 * A normalized API error.
 *
 * NestJS returns `message` in different shapes depending on the failure:
 *   400 (ValidationPipe)    -> message: string[]
 *   401/404 (thrown errors) -> message: string
 *
 * The interceptor (api-error.interceptor.ts) converts both into this single
 * shape once, so the UI never has to branch on `Array.isArray(...)`.
 */
export interface ApiError {
  /** HTTP status. 0 when the request never reached the server. */
  status: number;
  /** Always an array, even when the server sent a single string. */
  messages: string[];
  /**
   * Validation errors keyed by field path ("state", "experiences.0.endDate"),
   * present when the 400 body carries class-validator objects.
   */
  fieldErrors?: Record<string, string>;
}

/**
 * Type guard: lets TypeScript treat an `unknown` catch/subscribe error as
 * ApiError once this returns true.
 */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'messages' in value &&
    Array.isArray((value as ApiError).messages)
  );
}
