import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { appSlug } from './branding'

interface AccountSnapshot {
  loading: boolean
  user: User | null
  error: string | null
}

interface OAuthCallback {
  code: string | null
  error: string | null
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
const nativeCallbackUrl = new URL('com.sckwon770.waytogo://auth/callback')
const native = Capacitor.isNativePlatform()
const flowKey = `${appSlug}-oauth-flow:${supabaseUrl}`
const previousFlowKey = 'protein-oauth-flow:' + supabaseUrl
const listeners = new Set<() => void>()

export const accountAvailable = Boolean(supabaseUrl && supabaseKey.startsWith('sb_publishable_'))

let snapshot: AccountSnapshot = { loading: accountAvailable, user: null, error: null }
let awaitingNativeCallback = false
let leavingForWebSignIn = false
let lastNativeCallback: string | undefined
let nativeExchange: Promise<void> | undefined

function flowStorage() {
  // A web tab returns to its own verifier even if another tab signed in later.
  // A native callback may launch a fresh WebView after the process was killed.
  return native ? window.localStorage : window.sessionStorage
}

function accountRedirectUrl() {
  if (native) return nativeCallbackUrl
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  return url
}

export function getAccountSnapshot() {
  return snapshot
}

export function subscribeAccount(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function updateAccount(changes: Partial<AccountSnapshot>) {
  const next = { ...snapshot, ...changes }
  if (snapshot.loading === next.loading && snapshot.user === next.user && snapshot.error === next.error) return
  snapshot = next
  for (const listener of listeners) listener()
}

function readCallback(url: URL): OAuthCallback | null {
  const fragment = new URLSearchParams(url.hash.slice(1))
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error') ?? fragment.get('error')
    ?? url.searchParams.get('error_code') ?? fragment.get('error_code')
  return code || error ? { code, error } : null
}

function readWebCallback() {
  const url = new URL(window.location.href)
  const callback = readCallback(url)
  if (!callback) return null

  for (const param of ['code', 'error', 'error_code', 'error_description', 'error_uri']) {
    url.searchParams.delete(param)
  }
  const oldURL = window.location.href
  const fragment = new URLSearchParams(url.hash.slice(1))
  if (fragment.has('error') || fragment.has('error_code')) url.hash = ''
  window.history.replaceState(window.history.state, '', url)
  if (new URL(oldURL).hash !== url.hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL: url.href }))
  }
  return callback
}

async function completeSignIn(client: SupabaseClient, callback: OAuthCallback) {
  updateAccount({ loading: true, error: null })
  try {
    if (callback.error === 'access_denied') {
      updateAccount({ error: '로그인이 취소됐어요.' })
      return
    }
    if (!callback.code || callback.error) throw new Error('Missing OAuth authorization code')
    const storage = flowStorage()
    const flowId = storage.getItem(flowKey) ?? storage.getItem(previousFlowKey)
    const { data, error } = await client.auth.exchangeCodeForSession(
      callback.code, flowId ? { flowId } : undefined,
    )
    if (error || !data.session) throw new Error('OAuth code exchange failed')
    updateAccount({ user: data.session.user })
  } catch {
    updateAccount({ error: '로그인을 완료하지 못했어요. 다시 시도해 주세요.' })
  } finally {
    try {
      const storage = flowStorage()
      storage.removeItem(flowKey)
      storage.removeItem(previousFlowKey)
    } catch { /* Storage may be unavailable. */ }
    updateAccount({ loading: false })
  }
}

async function handleNativeCallback(client: SupabaseClient, href: string) {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return
  }
  if (url.protocol !== nativeCallbackUrl.protocol || url.host !== nativeCallbackUrl.host
    || url.pathname !== nativeCallbackUrl.pathname || url.username || url.password) return
  if (href === lastNativeCallback) return nativeExchange
  const callback = readCallback(url)
  if (!callback) return

  lastNativeCallback = href
  awaitingNativeCallback = false
  void Browser.close().catch(() => {})
  nativeExchange = completeSignIn(client, callback)
  return nativeExchange
}

async function initializeAccount() {
  const callback = native ? null : readWebCallback()
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { flowType: 'pkce', detectSessionInUrl: false },
  })

  client.auth.onAuthStateChange((_event, session) => {
    updateAccount({ user: session?.user ?? null })
  })

  if (native) {
    await Promise.all([
      App.addListener('appUrlOpen', ({ url }) => { void handleNativeCallback(client, url) }),
      Browser.addListener('browserFinished', () => {
        if (!awaitingNativeCallback) return
        awaitingNativeCallback = false
        updateAccount({ loading: false, error: '로그인이 취소됐어요.' })
      }),
    ])
    const launch = await App.getLaunchUrl()
    if (launch?.url) await handleNativeCallback(client, launch.url)
  } else {
    window.addEventListener('pageshow', (event) => {
      if (event.persisted && leavingForWebSignIn) {
        leavingForWebSignIn = false
        updateAccount({ loading: false, error: '로그인이 취소됐어요.' })
      }
    })
    if (callback) await completeSignIn(client, callback)
  }

  const { data, error } = await client.auth.getSession()
  if (error) updateAccount({ error: '계정 상태를 확인하지 못했어요. 다시 로그인해 주세요.' })
  updateAccount({ loading: false, user: data.session?.user ?? null })
  return client
}

const clientPromise = accountAvailable
  ? initializeAccount().catch(() => {
    updateAccount({ loading: false, error: '로그인 상태를 확인하지 못했어요.' })
    return null
  })
  : Promise.resolve(null)

export function getSupabaseClient(): Promise<SupabaseClient | null> {
  return clientPromise
}

export async function signInWithGoogle() {
  const client = await clientPromise
  if (!client) throw new Error('현재 로그인할 수 없어요.')
  if (snapshot.loading || snapshot.user) return
  updateAccount({ loading: true, error: null })

  try {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: accountRedirectUrl().href,
        skipBrowserRedirect: true,
      },
    })
    if (error || !data.url) throw new Error('OAuth sign-in initiation failed')
    const url = new URL(data.url)
    if (url.origin !== new URL(supabaseUrl).origin) throw new Error('Unexpected OAuth origin')
    const storage = flowStorage()
    if (data.flowId) storage.setItem(flowKey, data.flowId)
    else storage.removeItem(flowKey)
    storage.removeItem(previousFlowKey)
    if (native) {
      lastNativeCallback = undefined
      nativeExchange = undefined
      awaitingNativeCallback = true
      await Browser.open({ url: url.href })
    } else {
      leavingForWebSignIn = true
      window.location.assign(url)
    }
  } catch {
    awaitingNativeCallback = false
    leavingForWebSignIn = false
    const message = '로그인을 시작하지 못했어요. 다시 시도해 주세요.'
    updateAccount({ loading: false, error: message })
    throw new Error(message)
  }
}

export async function signOutAccount() {
  const client = await clientPromise
  if (!client || snapshot.loading) throw new Error('현재 로그아웃할 수 없어요.')
  updateAccount({ loading: true, error: null })
  try {
    const { error } = await client.auth.signOut({ scope: 'local' })
    if (error && snapshot.user) throw new Error('로그아웃하지 못했어요. 다시 시도해 주세요.')
    updateAccount({ user: null })
  } finally {
    updateAccount({ loading: false })
  }
}

export async function withdrawAccount(expectedUserId: string) {
  const client = await clientPromise
  if (!client) throw new Error('현재 회원 탈퇴를 진행할 수 없어요.')

  const { data: { session }, error: sessionError } = await client.auth.getSession()
  if (sessionError || !session || session.user.id !== expectedUserId) {
    throw new Error('로그인 계정을 다시 확인해 주세요.')
  }

  const { data, error } = await client.functions.invoke<{ success: boolean; appleRevocationRequired: boolean }>(
    'delete-account',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: {},
    },
  )
  if (error || data?.success !== true || typeof data.appleRevocationRequired !== 'boolean') {
    throw new Error('회원 탈퇴를 완료하지 못했어요. 다시 시도해 주세요.')
  }

  const current = await client.auth.getSession().catch(() => null)
  if ((current?.data.session?.user.id ?? snapshot.user?.id) === expectedUserId) {
    await client.auth.signOut({ scope: 'local' }).catch(() => {})
    if (snapshot.user?.id === expectedUserId) updateAccount({ user: null })
  }
  return { appleRevocationRequired: data.appleRevocationRequired }
}
