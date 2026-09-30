// RFC 6750 `b64token` after a case-insensitive scheme; a JWT is base64url segments joined by dots.
const BEARER_CREDENTIALS = /^Bearer +([\w.~+/-]+=*)$/i

export function extractBearerToken(authorization: string | undefined): string | undefined {
  if (authorization === undefined) return undefined
  return BEARER_CREDENTIALS.exec(authorization.trim())?.[1]
}
