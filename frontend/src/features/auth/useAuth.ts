import { useEffect, useRef, useState } from 'react'
import { AuthApiError } from './authTypes'
import type { AccountProfile, AuthUser, LoginCredentials, RegisterCredentials } from './authTypes'

type ApiUser = { id: number; username: string; email: string; full_name: string; phone: string }
const toUser = (user: ApiUser): AuthUser => ({ id: String(user.id), username: user.username, email: user.email, fullName: user.full_name, phone: user.phone })

export default function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const token = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const generation = useRef(0)
  function signOut() {
    generation.current += 1
    token.current = null
    setUser(null)
    if (timer.current) clearTimeout(timer.current)
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  async function request<T>(path: string, method: string, body?: unknown, bearer?: string): Promise<T> {
    let response: Response
    try {
      response = await fetch('/api' + path, {
        method, headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
    } catch { throw new Error('Cannot connect to the server. Please try again.') }
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 401 && bearer && token.current === bearer) signOut()
      throw new AuthApiError(result?.error?.message || 'Request failed. Please try again.', result?.error?.details ?? {})
    }
    if (!result?.data) throw new Error('Invalid server response.')
    return result.data as T
  }
  async function signIn(credentials: LoginCredentials) {
    const current = generation.current
    const result = await request<{ token: string; user: ApiUser }>('/auth/login', 'POST', credentials)
    if (generation.current !== current) throw new Error('Sign-in was cancelled.')
    const payload = JSON.parse(atob(result.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    token.current = result.token
    const next = toUser(result.user)
    setUser(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(signOut, Math.max(0, payload.exp * 1000 - Date.now()))
    return next
  }
  async function register({ username, email, password }: RegisterCredentials) {
    await request<ApiUser>('/auth/register', 'POST', { username, email, password })
  }
  async function updateProfile(profile: AccountProfile) {
    const bearer = token.current
    if (!bearer) throw new Error('Please log in again.')
    const next = await request<ApiUser>('/me', 'PATCH', { full_name: profile.fullName, phone: profile.phone }, bearer)
    if (token.current === bearer) setUser(toUser(next))
  }
  return { user, signIn, signOut, register, updateProfile }
}
