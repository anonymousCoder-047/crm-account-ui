/**
 * Centralized error handling utilities
 */

export interface AppError {
  message: string
  code?: string
  statusCode?: number
  details?: any
}

export class AuthenticationError extends Error {
  statusCode = 401
  code = 'AUTH_ERROR'

  constructor(message: string = 'Authentication failed') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  statusCode = 403
  code = 'AUTHZ_ERROR'

  constructor(message: string = 'Access denied') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class ValidationError extends Error {
  statusCode = 400
  code = 'VALIDATION_ERROR'

  constructor(message: string = 'Validation failed', public details?: any) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NetworkError extends Error {
  statusCode = 0
  code = 'NETWORK_ERROR'

  constructor(message: string = 'Network request failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

/**
 * Handle API errors and convert to appropriate error types
 */
export function handleApiError(error: any): AppError {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response

    if (status === 401) {
      return {
        message: data?.message || 'Authentication required',
        code: 'AUTH_ERROR',
        statusCode: 401,
        details: data,
      }
    }

    if (status === 403) {
      return {
        message: data?.message || 'Access denied',
        code: 'AUTHZ_ERROR',
        statusCode: 403,
        details: data,
      }
    }

    if (status === 404) {
      return {
        message: data?.message || 'Resource not found',
        code: 'NOT_FOUND',
        statusCode: 404,
        details: data,
      }
    }

    if (status >= 500) {
      return {
        message: data?.message || 'Server error',
        code: 'SERVER_ERROR',
        statusCode: status,
        details: data,
      }
    }

    return {
      message: data?.message || 'Request failed',
      code: 'API_ERROR',
      statusCode: status,
      details: data,
    }
  }

  if (error.request) {
    // Request made but no response received
    return {
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
      statusCode: 0,
    }
  }

  // Something else happened
  return {
    message: error.message || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    details: error,
  }
}

/**
 * Log error to error reporting service (e.g., Sentry, LogRocket)
 */
export function logError(error: Error | AppError, context?: Record<string, any>) {
  console.error('Error logged:', error, context)

  // Example: Send to error reporting service
  // if (window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     contexts: { custom: context },
  //   })
  // }
}

