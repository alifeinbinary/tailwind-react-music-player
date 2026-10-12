/**
 * Generates tiny deterministic WAV fixtures for browser tests:
 * `tone-2s.wav` and `tone-1s.wav` — mono, 8 kHz, 16-bit PCM, 440 Hz sine.
 * Idempotent: `node scripts/gen-fixtures.ts`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../src/test/fixtures', import.meta.url))

const wav = (seconds: number): Buffer => {
  const rate = 8000
  const n = Math.round(rate * seconds)
  const data = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) {
    const s = Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 0.5 * 32767)
    data.writeInt16LE(s, i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(rate, 24)
  header.writeUInt32LE(rate * 2, 28) // byte rate
  header.writeUInt16LE(2, 32) // block align
  header.writeUInt16LE(16, 34) // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

mkdirSync(dir, { recursive: true })
for (const s of [1, 2]) {
  const file = resolve(dir, `tone-${s}s.wav`)
  writeFileSync(file, wav(s))
  console.warn(`wrote ${file}`)
}
