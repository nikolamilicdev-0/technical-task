import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'auth:public'

/** Lets requests without a bearer token reach a route, or every route of a controller. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
