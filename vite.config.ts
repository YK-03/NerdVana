import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import nerdvanaAnswerHandler from './api/nerdvana-answer'

export default defineConfig(({ mode }) => {
  const frontendEnv = loadEnv(mode, process.cwd(), '')
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const mergedEnv = { ...rootEnv, ...frontendEnv }

  if (!process.env.GEMINI_API_KEY && mergedEnv.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = mergedEnv.GEMINI_API_KEY
  }
  if (!process.env.GEMINI_API_KEY && mergedEnv.VITE_GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = mergedEnv.VITE_GEMINI_API_KEY
  }
  if (!process.env.VITE_WHOOGLE_URL && mergedEnv.VITE_WHOOGLE_URL) {
    process.env.VITE_WHOOGLE_URL = mergedEnv.VITE_WHOOGLE_URL
  }

  return {
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    {
      name: 'nerdvana-api-dev-bridge',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url || !req.url.startsWith('/api/nerdvana-answer')) {
            next()
            return
          }

          try {
            const bodyChunks: Buffer[] = []
            await new Promise<void>((resolve, reject) => {
              req.on('data', (chunk) => bodyChunks.push(Buffer.from(chunk)))
              req.on('end', () => resolve())
              req.on('error', reject)
            })

            const headers = new Headers()
            for (const [key, value] of Object.entries(req.headers)) {
              if (Array.isArray(value)) {
                headers.set(key, value.join(', '))
              } else if (value !== undefined) {
                headers.set(key, value)
              }
            }

            const protocol = 'http'
            const host = req.headers.host ?? 'localhost:5173'
            const request = new Request(`${protocol}://${host}${req.url}`, {
              method: req.method ?? 'GET',
              headers,
              body:
                req.method && req.method !== 'GET' && req.method !== 'HEAD'
                  ? Buffer.concat(bodyChunks)
                  : undefined,
            })

            const response = await nerdvanaAnswerHandler(request)

            res.statusCode = response.status
            response.headers.forEach((value, key) => {
              res.setHeader(key, value)
            })

            const output = Buffer.from(await response.arrayBuffer())
            res.end(output)
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: 'Local API bridge failed',
                details: error instanceof Error ? error.message : String(error),
              }),
            )
          }
        })
      },
    },
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      "/api/search": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/search/, "/search"),
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
}
})
