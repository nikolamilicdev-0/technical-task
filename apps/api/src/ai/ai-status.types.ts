export type AiStatus =
  { readonly configured: true } | { readonly configured: false; readonly problem: string }
