import {
  apiRoutes,
  type UsageSummary,
  type UsageSummaryQuery,
  usageSummaryQuerySchema,
} from '@kb/contracts'
import { Controller, Get } from '@nestjs/common'

import { CurrentUser } from '../../common/auth/current-user.decorator.js'
import { ZodQuery } from '../../common/validation/zod-params.decorators.js'
import type { UserContext } from '../../database/user-context.types.js'
import { UsageService } from './usage.service.js'

@Controller()
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get(apiRoutes.usage.summary)
  summary(
    @CurrentUser() user: UserContext,
    @ZodQuery(usageSummaryQuerySchema) query: UsageSummaryQuery
  ): Promise<UsageSummary> {
    return this.usage.summary(user, query)
  }
}
