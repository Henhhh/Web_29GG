import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import ts from 'typescript'

const dir = await mkdtemp(join(tmpdir(), '29gg-services-'))
let store
const originalFetch = globalThis.fetch
try {
  for (const name of ['tokenStore', 'apiClient']) {
    const source = await readFile(new URL('../src/services/' + name + '.ts', import.meta.url), 'utf8')
    const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
    await writeFile(join(dir, name + '.mjs'), output.replaceAll("'./tokenStore'", "'./tokenStore.mjs'"))
  }
  store = await import(pathToFileURL(join(dir, 'tokenStore.mjs')))
  const { apiRequest, ApiError } = await import(pathToFileURL(join(dir, 'apiClient.mjs')))
  const token = id => 'header.' + Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now()/1000)+60 })).toString('base64url') + '.signature'
  const first = token('1'), second = token('2')
  let calls = 0
  globalThis.fetch = async (url, options) => {
    calls++
    assert.equal(url, '/api/me')
    assert.equal(options.headers.Authorization, 'Bearer ' + first)
    return Response.json({ data: { id: 1 } })
  }
  await assert.rejects(apiRequest('/me', {auth:true}), e => e.status === 401)
  assert.equal(calls, 0)
  store.setToken(first)
  assert.deepEqual(await apiRequest('/me', {auth:true}), {id:1})
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined)
    return Response.json({error:{code:'invalid_credentials',message:'Incorrect'}}, {status:401})
  }
  await assert.rejects(apiRequest('/auth/login', {method:'POST',body:{}}), ApiError)
  assert.equal(store.getToken(), first)
  globalThis.fetch = async () => new Response(null, {status:204})
  assert.equal(await apiRequest('/cart/items/1', {auth:true,method:'DELETE'}), undefined)
  globalThis.fetch = async () => Response.json({error:{code:'validation_failed',message:'Invalid',details:{phone:'Bad phone'}}}, {status:422})
  await assert.rejects(apiRequest('/me', {auth:true}), e => e.details.phone === 'Bad phone')
  let resolve
  globalThis.fetch = () => new Promise(r => {resolve=r})
  const pending = apiRequest('/me', {auth:true})
  store.setToken(second)
  resolve(Response.json({error:{message:'Expired'}}, {status:401}))
  await assert.rejects(pending, e => e.code === 'session_changed')
  assert.equal(store.getToken(), second)
  globalThis.fetch = async () => Response.json({error:{code:'unauthenticated',message:'Expired'}}, {status:401})
  await assert.rejects(apiRequest('/me', {auth:true}), e => e.status === 401)
  assert.equal(store.getToken(), null)
  globalThis.fetch = async () => { throw new TypeError('offline') }
  await assert.rejects(apiRequest('/products'), e => e.code === 'network_error')
  globalThis.fetch = async () => Response.json({unexpected:true})
  await assert.rejects(apiRequest('/products'), e => e.code === 'invalid_response')
  assert.throws(() => store.setToken('invalid'))
  console.log('Services checks passed: auth headers, public/private 401, 204, validation, stale session, network, invalid response/token.')
} finally {
  store?.clearToken()
  globalThis.fetch = originalFetch
  await rm(dir, {recursive:true,force:true})
}
