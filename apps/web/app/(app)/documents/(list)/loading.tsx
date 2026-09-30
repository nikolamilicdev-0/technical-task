import { DocumentsListBody } from '@/features/documents/components/DocumentsListBody'

// Inside the `(list)` group this boundary wraps the list alone; one level up it would also
// stand in for `/documents/new` and `/documents/[id]` while their segments load.
export default function DocumentsLoading() {
  return <DocumentsListBody loading />
}
