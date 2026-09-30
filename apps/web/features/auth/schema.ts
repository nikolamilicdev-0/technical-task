import { z } from 'zod'

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/features/auth/constants'

// Messages come from the dictionary error map (useZodResolver), so none are set here.
const emailSchema = z.string().trim().pipe(z.email())

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
})
