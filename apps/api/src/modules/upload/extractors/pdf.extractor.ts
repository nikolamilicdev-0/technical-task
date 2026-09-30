import { extractText, getDocumentProxy } from 'unpdf'

import { UPLOAD_MESSAGES } from '../upload.constants.js'
import { TextExtractionError } from './text-extraction.error.js'

// pdf.js would print warnings about recoverable damage with console.log; failures still reject.
const PDFJS_VERBOSITY_ERRORS = 0

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    // unpdf refuses Node Buffers and detaches the array it reads, so it gets a copy.
    return await readPdfText(new Uint8Array(bytes))
  } catch (error) {
    throw new TextExtractionError(UPLOAD_MESSAGES.unreadablePdf, { cause: error })
  }
}

async function readPdfText(data: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(data, { verbosity: PDFJS_VERBOSITY_ERRORS })
  try {
    const { text } = await extractText(pdf, { mergePages: true })
    return text
  } finally {
    await pdf.loadingTask.destroy()
  }
}
