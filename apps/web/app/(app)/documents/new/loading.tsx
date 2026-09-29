import { DocumentCreateBody } from '@/features/documents/components/DocumentCreateBody'

// Without it the list's loading.tsx would stand in for this page while it loads.
export default function NewDocumentLoading() {
  return <DocumentCreateBody loading />
}
