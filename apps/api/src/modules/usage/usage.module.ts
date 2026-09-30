import { Module } from '@nestjs/common'

import { UsageController } from './usage.controller.js'
import { UsageRecorder } from './usage-recorder.js'
import { UsageRepository } from './usage.repository.js'
import { UsageService } from './usage.service.js'

@Module({
  controllers: [UsageController],
  providers: [UsageRecorder, UsageRepository, UsageService],
  exports: [UsageRecorder],
})
export class UsageModule {}
