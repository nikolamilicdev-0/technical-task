/** Whether AI features can run; `problem` names the `AI_*` variables to fix. */
export type AiStatus =
  { readonly configured: true } | { readonly configured: false; readonly problem: string }
