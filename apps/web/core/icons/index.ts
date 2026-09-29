import {
  BookBookmarkIcon,
  ChartColumnIcon,
  FileQuestionMarkIcon,
  FileTextIcon,
  LogOutIcon,
  MailCheckIcon,
  MenuIcon,
  MessagesSquareIcon,
  TriangleAlertIcon,
  UserRoundIcon,
} from 'lucide-react'

/** The app's icon vocabulary; components refer to icons by name so the set stays consistent. */
export const icons = {
  brand: BookBookmarkIcon,
  documents: FileTextIcon,
  chat: MessagesSquareIcon,
  usage: ChartColumnIcon,
  menu: MenuIcon,
  user: UserRoundIcon,
  signOut: LogOutIcon,
  error: TriangleAlertIcon,
  notFound: FileQuestionMarkIcon,
  inbox: MailCheckIcon,
} as const

export type IconName = keyof typeof icons
