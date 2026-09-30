import { randomUUID } from 'node:crypto'

import type { Type } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test, type TestingModuleBuilder } from '@nestjs/testing'

import { AppModule } from '../../src/app.module.js'
import { configureHttp } from '../../src/app.setup.js'
import { JWT_VERIFIER } from '../../src/auth/auth.constants.js'
import type { JwtVerifier } from '../../src/auth/jwt-verifier.types.js'
import { APP_CONFIG } from '../../src/config/config.constants.js'
import { buildTestConfig } from '../fixtures.js'

export interface HttpResult {
  readonly response: Response
  readonly text: string
  readonly body: unknown
}

type Customize = (builder: TestingModuleBuilder) => TestingModuleBuilder

export class TestApp {
  private constructor(
    private readonly app: NestExpressApplication,
    readonly baseUrl: string,
    private readonly users: Map<string, string>
  ) {}

  static async start(
    customize: Customize = (builder) => builder,
    env: Record<string, string> = {}
  ): Promise<TestApp> {
    const config = buildTestConfig(env)
    const users = new Map<string, string>()
    const verify: JwtVerifier['verify'] = (token) => {
      const userId = users.get(token)
      return Promise.resolve(userId === undefined ? null : { userId })
    }
    const builder = Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(config)
      .overrideProvider(JWT_VERIFIER)
      .useValue({ verify })
    const moduleRef = await customize(builder).compile()
    // As in main.ts: a socket left open by an aborted stream must not stall close().
    const app = moduleRef.createNestApplication<NestExpressApplication>({
      logger: false,
      forceCloseConnections: true,
    })
    configureHttp(app, config)
    await app.listen(0, '127.0.0.1')
    return new TestApp(app, `${await app.getUrl()}/api`, users)
  }

  /** Authorization headers of a new user; limits count per user, so tests stay independent. */
  signIn(userId: string = randomUUID()): Record<string, string> {
    const token = `token-${userId}`
    this.users.set(token, userId)
    return { Authorization: `Bearer ${token}` }
  }

  async call(path: string, init: RequestInit = {}): Promise<HttpResult> {
    const response = await fetch(`${this.baseUrl}${path}`, init)
    const text = await response.text()
    return { response, text, body: parseJson(text) }
  }

  get<TProvider>(type: Type<TProvider>): TProvider {
    return this.app.get(type)
  }

  close(): Promise<void> {
    return this.app.close()
  }
}

function parseJson(text: string): unknown {
  try {
    return text === '' ? undefined : JSON.parse(text)
  } catch {
    return undefined
  }
}
