/** True when `pathname` is `base` itself or one of its nested routes (`/chat` covers `/chat/42`). */
export function isPathWithin(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`)
}
