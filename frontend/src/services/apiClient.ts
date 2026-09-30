import { clearToken, getSessionRevision, getToken } from './tokenStore'
export class ApiError extends Error {
  details: Record<string, string>
  status: number
  code: string
  constructor(message: string, details: Record<string, string> = {}, status = 0, code = 'request_failed') {
    super(message)
    this.details = details
    this.status = status
    this.code = code
    this.name = 'ApiError'
  }
}
type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; auth?: boolean; signal?: AbortSignal }
export async function apiRequest<T>(path: string, { method = 'GET', body, auth = false, signal }: Options = {}): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) throw new Error('Use an API path such as /me.')
  const bearer = auth ? getToken() : null
  const revision = getSessionRevision()
  if (auth && !bearer) throw new ApiError('Please log in again.', {}, 401, 'unauthenticated')
  let response: Response
  try {
    response = await fetch('/api' + path, {
      method, signal,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('Cannot connect to the server. Please try again.', {}, 0, 'network_error')
  }
  // Discard results from a previous account, including delayed 401 responses.
  if (auth && revision !== getSessionRevision()) throw new ApiError('Session changed. Please try again.', {}, 0, 'session_changed')
  const result = response.status === 204 ? null : await response.json().catch(() => null)
  if (auth && revision !== getSessionRevision()) throw new ApiError('Session changed. Please try again.', {}, 0, 'session_changed')
  if (!response.ok) {
    if (response.status === 401 && bearer) clearToken(bearer)
    throw new ApiError(result?.error?.message || 'Request failed. Please try again.', result?.error?.details ?? {}, response.status, result?.error?.code ?? 'request_failed')
  }
  if (response.status === 204) return undefined as T
  if (!result || !Object.prototype.hasOwnProperty.call(result, 'data')) throw new ApiError('Invalid server response.', {}, response.status, 'invalid_response')
  return result.data as T
}
