// Memory only. Decoding exp schedules logout; only the server verifies JWT.
let token: string | null = null
let revision = 0
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
export const getToken = () => token
export const getSessionRevision = () => revision
export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function clearToken(expected?: string) {
  if (expected !== undefined && expected !== token) return
  clearTimeout(timer)
  token = null
  revision++
  listeners.forEach(listener => listener())
}
export function setToken(next: string) {
  const part = next.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
  let expires: number
  try {
    const payload = JSON.parse(atob(part))
    expires = payload.exp * 1000
    if (!Number.isFinite(expires) || expires <= Date.now()) throw new Error()
  } catch { throw new Error('Invalid or expired sign-in token.') }
  clearTimeout(timer)
  token = next
  revision++
  const schedule = () => {
    if (token !== next) return
    const remaining = expires - Date.now()
    if (remaining <= 0) clearToken(next)
    else timer = setTimeout(schedule, Math.min(remaining, 2147483647))
  }
  schedule()
  listeners.forEach(listener => listener())
}
