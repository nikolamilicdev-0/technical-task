import {
  apiRoutes,
  type CreateDocumentInput,
  createDocumentSchema,
  type Document,
  type DocumentList,
  idSchema,
  type ListDocumentsQuery,
  listDocumentsQuerySchema,
  type UpdateDocumentInput,
  updateDocumentSchema,
} from '@kb/contracts'
import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common'

import { CurrentUser } from '../../common/auth/current-user.decorator.js'
import { ZodBody, ZodParam, ZodQuery } from '../../common/validation/zod-params.decorators.js'
import type { UserContext } from '../../database/user-context.types.js'
import { DOCUMENT_ID_PARAM, DOCUMENT_ITEM_ROUTE } from './documents.constants.js'
import { DocumentsService } from './documents.service.js'

@Controller(apiRoutes.documents.collection)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: UserContext,
    @ZodQuery(listDocumentsQuerySchema) query: ListDocumentsQuery
  ): Promise<DocumentList> {
    return this.documents.list(user, query)
  }

  @Post()
  create(
    @CurrentUser() user: UserContext,
    @ZodBody(createDocumentSchema) input: CreateDocumentInput
  ): Promise<Document> {
    return this.documents.create(user, input)
  }

  @Get(DOCUMENT_ITEM_ROUTE)
  get(
    @CurrentUser() user: UserContext,
    @ZodParam(DOCUMENT_ID_PARAM, idSchema) id: string
  ): Promise<Document> {
    return this.documents.get(user, id)
  }

  @Patch(DOCUMENT_ITEM_ROUTE)
  update(
    @CurrentUser() user: UserContext,
    @ZodParam(DOCUMENT_ID_PARAM, idSchema) id: string,
    @ZodBody(updateDocumentSchema) input: UpdateDocumentInput
  ): Promise<Document> {
    return this.documents.update(user, id, input)
  }

  @Delete(DOCUMENT_ITEM_ROUTE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: UserContext,
    @ZodParam(DOCUMENT_ID_PARAM, idSchema) id: string
  ): Promise<void> {
    return this.documents.remove(user, id)
  }
}
