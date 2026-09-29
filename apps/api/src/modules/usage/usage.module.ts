import { Module } from '@nestjs/common'

import { UsageRecorder } from './usage-recorder.js'

/** Records metered AI calls for every module that makes them. */
@Module({
  providers: [UsageRecorder],
  exports: [UsageRecorder],
})
export class UsageModule {}
