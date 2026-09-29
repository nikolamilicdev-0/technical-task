import { Flex, Grid, Text } from '@kb/ui'
import type { ReactNode } from 'react'

import { Wordmark } from '@/core/components/shell/Wordmark'
import { getDictionary } from '@/core/i18n/dictionary'
import { getAuthStrings } from '@/features/auth/lib/auth-strings'

/** Sign-in and sign-up frame: the product's promise beside the form from `lg` up. */
export function AuthShell({ children }: { children: ReactNode }) {
  const dictionary = getDictionary()
  const strings = getAuthStrings(dictionary)
  const appName = dictionary.common.appName

  return (
    <Grid columns={{ base: 1, lg: 2 }} className="min-h-dvh">
      <Flex
        direction="column"
        justify="between"
        gap="2xl"
        className="hidden border-e border-outline-variant bg-surface-container-low p-12 lg:flex xl:p-16"
      >
        <Wordmark name={appName} />
        <Flex direction="column" gap="lg" className="max-w-xl">
          <Text as="p" variant="display">
            {strings.statement}
          </Text>
          <Text tone="muted" className="max-w-md text-base leading-7">
            {strings.supporting}
          </Text>
        </Flex>
      </Flex>
      <Flex direction="column" className="px-4 py-6 sm:px-8">
        <Flex className="lg:hidden">
          <Wordmark name={appName} />
        </Flex>
        <Flex as="main" align="center" justify="center" className="flex-1 py-10">
          <Flex direction="column" className="w-full max-w-sm">
            {children}
          </Flex>
        </Flex>
      </Flex>
    </Grid>
  )
}
