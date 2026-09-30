import { useEffect, useRef, useState } from 'react'
import * as authApi from './authApi'
import { clearToken, getSessionRevision, getToken, setToken, subscribeSession } from '../../services/tokenStore'
import type { AccountProfile, AuthUser, LoginCredentials } from './authTypes'

export default function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const attempt = useRef(0)
  useEffect(() => subscribeSession(() => { if (!getToken()) setUser(null) }), [])
  useEffect(() => () => { attempt.current++ }, [])
  function signOut() { attempt.current++; clearToken(); setUser(null) }
  async function signIn(credentials: LoginCredentials) {
    const current = ++attempt.current
    const revision = getSessionRevision()
    const result = await authApi.login(credentials)
    if (current !== attempt.current || revision !== getSessionRevision()) throw new Error('Sign-in was cancelled.')
    setToken(result.token)
    setUser(result.user)
    return result.user
  }
  async function updateProfile(profile: AccountProfile) {
    const revision = getSessionRevision()
    const next = await authApi.updateProfile(profile)
    if (revision === getSessionRevision()) setUser(next)
  }
  return { user, signIn, signOut, register: authApi.register, updateProfile }
}
