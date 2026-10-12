import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { defineConfig } from 'vitest/config'
import pkg from './package.json'

const BUNDLE_EXTERNAL_PACKAGES = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
]

const UMD_EXTERNAL_PACKAGES = Object.keys(pkg.peerDependencies)

const external = (packages: string[]) => (id: string) =>
  packages.some((dep) => id === dep || id.startsWith(`${dep}/`))

const banner = `/**
 * ${pkg.name} v${pkg.version}
 * ${pkg.description}
 *
${readFileSync(resolve(__dirname, './LICENCE'), 'utf-8')
  .split('\n')
  .map((line) => ` * ${line}`)
  .join('\n')}
 */`

// `vite build`           -> ESM (dist/index.js) + CJS (dist/index.cjs) + .d.ts
// `vite build --mode umd` -> dist/tailwind-react-music-player.min.js (UMD, deps bundled)
export default defineConfig(({ mode }) => {
  const isUmd = mode === 'umd'

  return {
    plugins: [
      react({ jsxRuntime: 'classic' }),
      !isUmd &&
        dts({
          include: ['src'],
          entryRoot: 'src',
          tsconfigPath: resolve(__dirname, './tsconfig.json'),
        }),
    ].filter(Boolean),
    build: {
      outDir: 'dist',
      emptyOutDir: !isUmd,
      minify: isUmd,
      lib: {
        entry: resolve(__dirname, 'src/index.tsx'),
        name: 'ReactJkMusicPlayer',
        formats: isUmd ? ['umd'] : ['es', 'cjs'],
        fileName: (format) =>
          format === 'es'
            ? 'index.js'
            : format === 'cjs'
            ? 'index.cjs'
            : 'tailwind-react-music-player.min.js',
      },
      rollupOptions: {
        external: external(
          isUmd ? UMD_EXTERNAL_PACKAGES : BUNDLE_EXTERNAL_PACKAGES,
        ),
        output: {
          banner,
          // expose the default export itself as the UMD global
          exports: 'default',
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['__tests__/setup.ts'],
      snapshotSerializers: ['enzyme-to-json/serializer'],
      include: ['__tests__/tests/**/*.test.{ts,tsx,js,jsx}'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
      },
    },
  }
})
