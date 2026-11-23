import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const DEFAULT_DEV_PORT = 3002

/** Resolves the API origin, failing production builds when it is missing or not https. */
function resolveApiOrigin(rawUrl: string | undefined, isProductionBuild: boolean): string | null {
  const value = rawUrl?.trim()
  if (!value) {
    if (isProductionBuild) {
      throw new Error(
        'VITE_ADMIN_API_URL is required for production builds (e.g. https://api.example.com). ' +
          'Set it in the build environment or in .env.production.',
      )
    }
    return null
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`VITE_ADMIN_API_URL is not a valid URL: ${value}`)
  }
  if (isProductionBuild && url.protocol !== 'https:') {
    throw new Error(`VITE_ADMIN_API_URL must use https for production builds (got ${url.protocol}).`)
  }
  return url.origin
}

/**
 * Injects a Content-Security-Policy <meta> tag into the built index.html as a
 * fallback for hosts that do not send the headers in customHttp.yml. It is
 * build-only because the dev server relies on inline scripts for HMR.
 * frame-ancestors cannot be set from a meta tag; it comes from the headers.
 */
function cspMetaPlugin(apiOrigin: string | null): Plugin {
  const connectSrc = ["'self'", apiOrigin].filter(Boolean).join(' ')
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'admin-csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_')
  const isProductionBuild = command === 'build' && mode === 'production'
  const apiOrigin = resolveApiOrigin(env.VITE_ADMIN_API_URL, isProductionBuild)

  const parsedPort = Number(env.VITE_DEV_PORT)
  const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_DEV_PORT

  return {
    plugins: [react(), cspMetaPlugin(apiOrigin)],
    server: {
      port,
    },
    preview: {
      port,
    },
    build: {
      rolldownOptions: {
        output: {
          // Long-lived vendor chunks for the framework code every page needs.
          // Everything else (e.g. recharts) stays with the lazy route using it.
          codeSplitting: {
            groups: [
              { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/, priority: 30 },
              { name: 'vendor-refine', test: /node_modules[\\/](@refinedev|@tanstack)[\\/]/, priority: 20 },
            ],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
