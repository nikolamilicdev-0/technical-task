import type { Health, Readiness } from '@kb/contracts'
import { Inject, Injectable, Logger } from '@nestjs/common'

import { AI_STATUS } from '../../ai/ai.constants.js'
import type { AiStatus } from '../../ai/ai-status.types.js'
import { describeError } from '../../common/errors/describe-error.js'
import { readPackageVersion } from '../../config/package-version.js'
import { SupabaseClientFactory } from '../../database/supabase-client.factory.js'
import { HealthRepository } from './health.repository.js'
import { assessReadiness } from './readiness.js'

@Injectable()
export class HealthService {
  readonly #logger = new Logger(HealthService.name)
  readonly #version = readPackageVersion()

  constructor(
    private readonly clients: SupabaseClientFactory,
    private readonly repository: HealthRepository,
    @Inject(AI_STATUS) private readonly aiStatus: AiStatus
  ) {}

  liveness(): Health {
    return { status: 'ok', uptimeSeconds: Math.floor(process.uptime()), version: this.#version }
  }

  async readiness(): Promise<Readiness> {
    const columnDimensions = await this.#columnDimensions()
    return assessReadiness({ columnDimensions, aiConfigured: this.aiStatus.configured })
  }

  // Only `authenticated` and `service_role` may call the function, and a probe has no user token.
  async #columnDimensions(): Promise<number | undefined> {
    try {
      return await this.repository.embeddingColumnDimensions(this.clients.serviceRole())
    } catch (error) {
      this.#logger.warn(`Readiness database check failed: ${describeError(error)}`)
      return undefined
    }
  }
}
