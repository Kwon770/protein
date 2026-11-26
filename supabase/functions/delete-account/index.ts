import { createClient } from 'npm:@supabase/supabase-js@2.119.2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2.119.2/cors'

const headers = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}

const clientOptions = { auth: { autoRefreshToken: false, persistSession: false } }

function readKey(keySet: string, legacyKey: string) {
  const configuredKeys = Deno.env.get(keySet)
  const keys = configuredKeys ? JSON.parse(configuredKeys) as { default?: string } : undefined
  return keys?.default || Deno.env.get(legacyKey)
}

function fail(status: number, error: string) {
  return Response.json({ error }, { status, headers })
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, {
      status: 405,
      headers: { ...headers, Allow: 'POST, OPTIONS' },
    })
  }

  const accessToken = /^Bearer\s+(\S+)$/i.exec(request.headers.get('Authorization') ?? '')?.[1]
  if (!accessToken) return fail(401, 'authentication_required')

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const publishableKey = readKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
    if (!url || !publishableKey) return fail(500, 'function_not_configured')

    const auth = createClient(url, publishableKey, clientOptions)
    const { data: { user }, error: authError } = await auth.auth.getUser(accessToken)
    if (authError) {
      if (authError.status && [400, 401, 403, 404].includes(authError.status)) {
        return fail(401, 'authentication_required')
      }
      return fail(502, 'authentication_unavailable')
    }
    if (!user?.id) return fail(401, 'authentication_required')

    const secretKey = readKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
    if (!secretKey) return fail(500, 'function_not_configured')

    // Apple TN3194 uses manual revocation when no provider token is retained.
    const { app_metadata: appMetadata, identities } = user
    const appleRevocationRequired = identities?.some(({ provider }) => provider === 'apple') === true
      || appMetadata?.provider === 'apple'
      || (Array.isArray(appMetadata?.providers) && appMetadata.providers.includes('apple'))

    const admin = createClient(url, secretKey, clientOptions)
    // Hard deletion also removes the Auth sessions and prevents token refresh.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false)
    if (deleteError && deleteError.code !== 'user_not_found') {
      console.error('delete-account: Supabase Auth deletion failed', deleteError.status, deleteError.code)
      return fail(502, 'account_deletion_failed')
    }

    return Response.json({ success: true, appleRevocationRequired }, { headers })
  } catch {
    return fail(500, 'account_deletion_failed')
  }
})
