import type { Metadata } from 'next'

import { getDictionary } from '@/core/i18n/dictionary'
import { SignupBody } from '@/features/auth/components/SignupBody'

export const metadata: Metadata = { title: getDictionary().auth.signup.metaTitle }

export default function SignupPage() {
  return <SignupBody />
}
