import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The calculator registry (src/data/calculators/*.ts) is ~3.7 MB of TypeScript that
// tests/*.test.ts require as a synchronous named export, so it cannot be lazy-loaded.
// Splitting it into per-family chunks keeps every emitted chunk small enough to be
// fetched in parallel and revalidated independently when one data family changes.
const DATA_FAMILIES = [
  'wave2',
  'wave3',
  'wave4',
  'wave5',
  'wave6',
  'missing',
] as const

function dataChunkName(id: string): string | undefined {
  const match = /\/src\/data\/calculators\/([^/]+)\.ts$/.exec(id.replace(/\\/g, '/'))
  if (!match) return undefined
  const file = match[1]
  if (file === 'index') return undefined

  const family = DATA_FAMILIES.find((f) => file.startsWith(`${f}-`))
  if (!family) return 'calc-base'

  // Two chunks per family: each family is ~600 kB minified on its own.
  const rest = file.slice(family.length + 1)
  const half = rest.charCodeAt(0) % 2 === 0 ? 'a' : 'b'
  return `calc-${family}-${half}`
}

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          const dataChunk = dataChunkName(id)
          if (dataChunk) return dataChunk
          if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id.replace(/\\/g, '/'))) {
            return 'vendor-react'
          }
          return undefined
        },
      },
    },
  },
})
