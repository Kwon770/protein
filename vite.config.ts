import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const publicSupabaseVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']

function isPublicSupabaseKey(key: string) {
  if (key.startsWith('sb_publishable_')) return true

  const parts = key.split('.')
  if (parts.length !== 3) return false

  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return claims?.role === 'anon'
  } catch {
    return false
  }
}

export default defineConfig(({ mode }) => {
  const { VITE_SUPABASE_PUBLISHABLE_KEY } = loadEnv(mode, process.cwd(), publicSupabaseVars)
  const key = VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (key && !isPublicSupabaseKey(key)) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable or legacy anon key.')
  }

  return {
    envPrefix: publicSupabaseVars,
    plugins: [react()],
    build: {
      license: { fileName: 'licenses/npm.md' },
    },
  }
})
