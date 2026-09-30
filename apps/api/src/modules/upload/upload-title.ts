import { extname } from 'node:path'

import { DOCUMENT_TITLE_MAX } from '@kb/contracts'

import { truncateUtf16 } from '../../common/utils/text.js'
import { UNTITLED_UPLOAD_TITLE } from './upload.constants.js'

export function titleFromFilename(filename: string): string {
  const stem = filename.slice(0, filename.length - extname(filename).length)
  const title = truncateUtf16(stem.trim(), DOCUMENT_TITLE_MAX).trim()
  return title === '' ? UNTITLED_UPLOAD_TITLE : title
}
