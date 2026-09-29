import type { LoginValues, SignupValues } from '@/features/auth/types'

export const PASSWORD_MIN_LENGTH = 8

/** Supabase Auth hashes with bcrypt, which ignores anything past 72 bytes. */
export const PASSWORD_MAX_LENGTH = 72

export const LOGIN_DEFAULT_VALUES: LoginValues = { email: '', password: '' }

export const SIGNUP_DEFAULT_VALUES: SignupValues = { email: '', password: '' }
