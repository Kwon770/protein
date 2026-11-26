import { defineConfig, loadEnv, type Plugin } from 'vite'
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

function linkPreview(siteUrl: string): Plugin {
  const page = new URL(siteUrl)
  if (!['http:', 'https:'].includes(page.protocol) || page.username || page.password || page.search || page.hash) {
    throw new Error('SITE_URL must be an HTTP(S) URL without credentials, query parameters, or a fragment.')
  }
  if (!page.pathname.endsWith('/')) page.pathname += '/'
  const title = '단백하게 · 단백질 기록'
  const description = '하루 목표를 정하고 먹은 음식의 단백질을 기록해 보세요.'
  const image = new URL('way-to-go-share.jpg', page).href
  const imageAlt = '라임색 배경 위 초코 셰이커'

  return {
    name: 'way-to-go-link-preview',
    transformIndexHtml() {
      return [
        ...Object.entries({
          'og:type': 'website',
          'og:url': page.href,
          'og:title': title,
          'og:description': description,
          'og:image': image,
          'og:image:width': '1200',
          'og:image:height': '630',
          'og:image:alt': imageAlt,
        }).map(([property, content]) => ({ tag: 'meta', attrs: { property, content } })),
        ...Object.entries({
          'twitter:card': 'summary_large_image',
          'twitter:title': title,
          'twitter:description': description,
          'twitter:image': image,
          'twitter:image:alt': imageAlt,
        }).map(([name, content]) => ({ tag: 'meta', attrs: { name, content } })),
      ]
    },
  }
}

export default defineConfig(({ mode }) => {
  const { VITE_SUPABASE_PUBLISHABLE_KEY } = loadEnv(mode, process.cwd(), publicSupabaseVars)
  const key = VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (key && !isPublicSupabaseKey(key)) {
    throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable or legacy anon key.')
  }

  const { SITE_URL } = loadEnv(mode, process.cwd(), 'SITE_URL')
  const siteUrl = SITE_URL?.trim()

  return {
    envPrefix: publicSupabaseVars,
    plugins: [react(), siteUrl ? linkPreview(siteUrl) : undefined],
    build: {
      license: { fileName: 'licenses/npm.md' },
    },
  }
})
