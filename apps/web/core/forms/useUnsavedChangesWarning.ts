import { useEffect } from 'react'

/** Asks the browser to confirm reloading or closing the tab while `active` (unsaved edits). */
export function useUnsavedChangesWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [active])
}
