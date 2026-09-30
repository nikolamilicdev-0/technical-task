import { Button, Dialog } from '@kb/ui'
import { useState } from 'react'

import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { ConversationListClient } from '@/features/chat/components/ConversationListClient'
import { getChatStrings } from '@/features/chat/lib/chat-strings'

export function MobileConversationsButton() {
  const t = useT()
  const strings = getChatStrings(t)
  const [open, setOpen] = useState(false)
  const closeDrawer = () => setOpen(false)
  const ConversationsIcon = icons.conversations

  const trigger = (
    <Button variant="ghost" size="icon" aria-label={strings.list.open} className="lg:hidden">
      <ConversationsIcon aria-hidden />
    </Button>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={strings.list.title}
      closeLabel={t.common.close}
      placement="start"
    >
      <ConversationListClient onNavigate={closeDrawer} showTitle={false} />
    </Dialog>
  )
}
