import { apiRoutes, type Health, type Readiness } from '@kb/contracts'
import { Controller, Get, HttpStatus, Res } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import type { Response } from 'express'

import { Public } from '../../common/auth/public.decorator.js'
import { HealthService } from './health.service.js'

@Public()
@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get(apiRoutes.health)
  liveness(): Health {
    return this.health.liveness()
  }

  /** 503 while not ready, so load balancers and orchestrators can act on the status code alone. */
  @Get(apiRoutes.healthReady)
  async readiness(@Res({ passthrough: true }) response: Response): Promise<Readiness> {
    const readiness = await this.health.readiness()
    if (readiness.status !== 'ok') response.status(HttpStatus.SERVICE_UNAVAILABLE)
    return readiness
  }
}
