import { apiError } from './http.ts';

// SQLSTATE -> HTTP status. Business RPCs raise single-token messages with an
// explicit errcode, so we map on the code, not on brittle message substrings.
const STATUS_BY_SQLSTATE: Record<string, number> = {
  '40001': 409, // serialization_failure -> optimistic conflict
  '42501': 403, // insufficient_privilege
  'P0002': 404, // no_data_found
  PT429: 429, // rate limit (custom class, see ingest_image_analysis)
};

export interface DbErrorLike {
  code?: string | null;
  message?: string | null;
}

export interface CodeOverride {
  status?: number;
  message: string;
}

export interface FallbackError {
  code: string;
  message: string;
  status: number;
}

const DEFAULT_FALLBACK: FallbackError = {
  code: 'REQUEST_FAILED',
  message: '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
  status: 500,
};

function statusForSqlstate(sqlstate: string): number | undefined {
  if (STATUS_BY_SQLSTATE[sqlstate] !== undefined) return STATUS_BY_SQLSTATE[sqlstate];
  // 22xxx data exceptions and 23xxx integrity violations are caller input problems.
  if (sqlstate.startsWith('22') || sqlstate.startsWith('23')) return 400;
  return undefined;
}

/**
 * Maps a Postgres/PostgREST error into a standard `{ error: { code, message } }`
 * response. `overrides` keys on the raised business code (e.g. OWNER_TRANSFER_REQUIRED)
 * to pin a Korean message and, when SQLSTATE alone is not enough, a status.
 * Genuinely unexpected errors fall through to a logged 500.
 */
export function mapDbError(
  error: DbErrorLike | null | undefined,
  overrides: Record<string, CodeOverride> = {},
  fallback: FallbackError = DEFAULT_FALLBACK,
): Response {
  const sqlstate = error?.code ?? '';
  const raised = (error?.message ?? '').trim();
  const named = /^[A-Z0-9_]+$/u.test(raised) ? raised : '';
  const override = named ? overrides[named] : undefined;
  const status = override?.status ?? statusForSqlstate(sqlstate);

  if (status === undefined || !named) {
    console.error('unmapped db error', { code: sqlstate, message: raised });
    return apiError(fallback.code, fallback.message, fallback.status);
  }
  return apiError(named, override?.message ?? fallback.message, status);
}
