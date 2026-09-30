import { Button, Flex, Input } from '@kb/ui'
import Link from 'next/link'
import type { ChangeEvent, Ref } from 'react'

import { routes } from '@/core/config/routes'
import { useT } from '@/core/i18n/useT'
import { icons } from '@/core/icons'
import { DocumentsTagFilter } from '@/features/documents/components/DocumentsTagFilter'
import { getDocumentsStrings } from '@/features/documents/lib/documents-strings'

interface DocumentsToolbarProps {
  search: string
  onSearchChange: (search: string) => void
  tags: readonly string[]
  selectedTags: readonly string[]
  onSelectedTagsChange: (tags: string[]) => void
  onUpload: () => void
  uploadButtonRef?: Ref<HTMLButtonElement>
}

export function DocumentsToolbar({
  search,
  onSearchChange,
  tags,
  selectedTags,
  onSelectedTagsChange,
  onUpload,
  uploadButtonRef,
}: DocumentsToolbarProps) {
  const strings = getDocumentsStrings(useT())
  const SearchIcon = icons.search
  const AddIcon = icons.add
  const UploadIcon = icons.upload
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) =>
    onSearchChange(event.target.value)

  return (
    <Flex direction={{ base: 'column', sm: 'row' }} gap="sm">
      <Flex gap="sm" className="min-w-0 flex-1">
        <Flex role="search" align="center" className="relative min-w-0 flex-1">
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute start-3 size-4 text-on-surface-variant"
          />
          <Input
            type="search"
            value={search}
            onChange={handleSearchChange}
            aria-label={strings.list.searchLabel}
            placeholder={strings.list.searchPlaceholder}
            className="ps-9"
          />
        </Flex>
        <DocumentsTagFilter tags={tags} selected={selectedTags} onChange={onSelectedTagsChange} />
      </Flex>
      <Flex gap="sm">
        <Button
          ref={uploadButtonRef}
          variant="outline"
          onClick={onUpload}
          className="flex-1 sm:flex-none"
        >
          <UploadIcon aria-hidden />
          {strings.actions.upload}
        </Button>
        <Button asChild className="flex-1 sm:flex-none">
          <Link href={routes.documents.new}>
            <AddIcon aria-hidden />
            {strings.actions.new}
          </Link>
        </Button>
      </Flex>
    </Flex>
  )
}
