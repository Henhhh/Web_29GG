import { apiRequest } from '../../services/apiClient'
import type { AccountProfile, AuthUser, LoginCredentials, RegisterCredentials } from './authTypes'
type ApiUser = { id: number; username: string; email: string; full_name: string; phone: string }
const toUser = (user: ApiUser): AuthUser => ({ id: String(user.id), username: user.username, email: user.email, fullName: user.full_name, phone: user.phone })
export async function login(credentials: LoginCredentials) {
  const result = await apiRequest<{ token: string; user: ApiUser }>('/auth/login', { method: 'POST', body: credentials })
  return { token: result.token, user: toUser(result.user) }
}
export async function register({ username, email, password }: RegisterCredentials) {
  return toUser(await apiRequest<ApiUser>('/auth/register', { method: 'POST', body: { username, email, password } }))
}
export async function getMe() {
  return toUser(await apiRequest<ApiUser>('/me', { auth: true }))
}
export async function updateProfile(profile: AccountProfile) {
  return toUser(await apiRequest<ApiUser>('/me', { method: 'PATCH', auth: true, body: { full_name: profile.fullName, phone: profile.phone } }))
}
