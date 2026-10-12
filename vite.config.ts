import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vitest/config'
import pkg from './package.json'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const BUNDLE_EXTERNAL_PACKAGES = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
]

const external = (packages: string[]) => (id: string) =>
  packages.some((dep) => id === dep || id.startsWith(`${dep}/`))

const banner = `"use client";
/**
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 *
${readFileSync(resolve(__dirname, './LICENCE'), 'utf-8')
  .split('\n')
  .map((line) => ` * ${line}`)
  .join('\n')}
 */`

// `vite build` -> ESM only (dist/index.js) + .d.ts
export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      entryRoot: 'src',
      tsconfigPath: resolve(__dirname, './tsconfig.build.json'),
    }),
  ],
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: external(BUNDLE_EXTERNAL_PACKAGES),
      output: {
        banner,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['__tests__/setup.ts'],
    include: ['__tests__/tests/**/*.test.{ts,tsx,js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/types.ts', 'src/config/locale.ts'],
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 75,
        lines: 75,
      },
    },
  },
})
