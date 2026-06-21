import { NextResponse } from 'next/server'

export type ApiErrorCode =
    | 'BAD_REQUEST'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'PAYLOAD_TOO_LARGE'
    | 'RATE_LIMITED'
    | 'INTERNAL_ERROR'
    | 'SERVICE_UNAVAILABLE'

const STATUS_MAP: Record<ApiErrorCode, number> = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    PAYLOAD_TOO_LARGE: 413,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
}

export class ApiError extends Error {
    constructor(
        public readonly code: ApiErrorCode,
        message: string,
        public readonly details?: unknown
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

export function logApiError(context: string, error: unknown, extra?: Record<string, unknown>) {
    const payload = {
        context,
        ...extra,
        error: error instanceof Error ? { name: error.name, message: error.message } : error,
    }
    console.error(`[API Error] ${context}`, JSON.stringify(payload))
}

export function apiErrorResponse(error: unknown, context: string): NextResponse {
    if (error instanceof ApiError) {
        logApiError(context, error, { code: error.code })
        return NextResponse.json(
            { error: error.message, code: error.code },
            { status: STATUS_MAP[error.code] }
        )
    }

    logApiError(context, error)
    return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' as const },
        { status: 500 }
    )
}

export function apiSuccessResponse<T extends Record<string, unknown>>(data: T, status = 200): NextResponse {
    return NextResponse.json(data, { status })
}
