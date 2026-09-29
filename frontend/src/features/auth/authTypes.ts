export type AuthUser = {
  id?: string
  username: string
  email: string
  fullName?: string
  phone?: string
}

export type AccountProfile = { fullName: string; phone: string }

export type LoginCredentials = {
  email: string
  password: string
}

export type RegisterCredentials = LoginCredentials & {
  username: string
  confirmPassword: string
}

export type AuthView = 'login' | 'register'

export class AuthApiError extends Error {
  details: Record<string, string>
  constructor(message: string, details: Record<string, string> = {}) {
    super(message)
    this.details = details
  }
}
