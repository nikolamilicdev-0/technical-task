import { Global, Module } from '@nestjs/common'

import { SupabaseClientFactory } from './supabase-client.factory.js'

@Global()
@Module({
  providers: [SupabaseClientFactory],
  exports: [SupabaseClientFactory],
})
export class DatabaseModule {}
