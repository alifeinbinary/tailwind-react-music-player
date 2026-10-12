import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { playwright } from '@vitest/browser-playwright'
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
    // needed so browser tests can import src/styles/index.css for real
    tailwindcss(),
    dts({
      include: ['src'],
      entryRoot: 'src',
      bundleTypes: true,
      tsconfigPath: resolve(__dirname, './tsconfig.build.json'),
    }),
  ],
  build: {
    outDir: 'dist',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
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
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: process.env.CI ? 'test-results/junit.xml' : undefined,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/types.ts',
        'src/types/**',
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.browser.test.{ts,tsx}',
      ],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
        'src/components/**': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
        'src/core/**': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/components/controls/**': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
        'src/hooks/**': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/**/*.browser.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          globals: true,
          setupFiles: ['src/test/setup.browser.ts'],
          include: ['src/**/*.browser.test.{ts,tsx}'],
          browser: {
            enabled: true,
            provider: playwright({
              launchOptions: {
                args: ['--autoplay-policy=no-user-gesture-required'],
              },
            }),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
