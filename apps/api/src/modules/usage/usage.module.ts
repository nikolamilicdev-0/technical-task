import { Module } from '@nestjs/common'

import { UsageController } from './usage.controller.js'
import { UsageRecorder } from './usage-recorder.js'
import { UsageRepository } from './usage.repository.js'
import { UsageService } from './usage.service.js'

/** Meters AI calls for every module that makes them, and reports usage to its owner. */
@Module({
  controllers: [UsageController],
  providers: [UsageRecorder, UsageRepository, UsageService],
  exports: [UsageRecorder],
})
export class UsageModule {}
