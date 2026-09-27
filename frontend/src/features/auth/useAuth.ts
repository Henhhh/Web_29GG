import { useState } from 'react'
import type { AccountProfile, AuthUser } from './authTypes'
const sessionKey = '29gg-auth-demo-user'
function storedUser(): AuthUser | null {
  try { const value = JSON.parse(localStorage.getItem(sessionKey) ?? 'null'); return value && typeof value.username === 'string' && typeof value.email === 'string' ? { username: value.username, email: value.email, fullName: typeof value.fullName === 'string' ? value.fullName : '', phone: typeof value.phone === 'string' ? value.phone : '' } : null } catch { return null }
}
const profileKey = (email: string) => `29gg-profile:${email.trim().toLowerCase()}`
function storedProfile(email: string): AccountProfile {
  try {
    const value = JSON.parse(localStorage.getItem(profileKey(email)) ?? 'null')
    return { fullName: typeof value?.fullName === 'string' ? value.fullName : '', phone: typeof value?.phone === 'string' ? value.phone : '' }
  } catch { return { fullName: '', phone: '' } }
}
// Phiên giao diện tạm thời, sẽ thay bằng API xác thực.
export default function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(storedUser)
  function saveSession(nextUser: AuthUser) { setUser(nextUser); try { localStorage.setItem(sessionKey, JSON.stringify(nextUser)) } catch { /* Phiên trong bộ nhớ vẫn hoạt động. */ } }
  function signIn(nextUser: AuthUser) { saveSession({ ...storedProfile(nextUser.email), ...nextUser }) }
  function updateProfile(profile: AccountProfile) {
    if (!user) return
    const cleaned = { fullName: profile.fullName.trim(), phone: profile.phone.trim() }
    saveSession({ ...user, ...cleaned })
    try { localStorage.setItem(profileKey(user.email), JSON.stringify(cleaned)) } catch { /* Phiên trong bộ nhớ vẫn hoạt động. */ }
  }
  function signOut() { setUser(null); try { localStorage.removeItem(sessionKey) } catch { /* Storage có thể bị khóa. */ } }
  return { user, signIn, signOut, updateProfile }
}
