export const JWT_VERIFIER = Symbol('JWT_VERIFIER')

/** Only user sessions carry this role; the anon and service-role keys are rejected. */
export const AUTHENTICATED_ROLE = 'authenticated'

export const MISSING_TOKEN_MESSAGE = 'Missing bearer token'
export const INVALID_TOKEN_MESSAGE = 'Invalid or expired access token'
