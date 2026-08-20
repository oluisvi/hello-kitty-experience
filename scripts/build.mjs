import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(new URL('..', import.meta.url).pathname)
const dist = join(root, 'dist')

const required = [
  'index.html',
  'src/main.js',
  'src/styles/main.css',
  'src/three/kitty3d.js',
  'public/assets/models/hello-kitty.glb',
  ...Array.from({ length: 8 }, (_, index) => `public/assets/photos/photo-${String(index + 1).padStart(2, '0')}.webp`),
]

for (const file of required) {
  await stat(join(root, file)).catch(() => {
    throw new Error(`Missing required file: ${file}`)
  })
}

const html = await readFile(join(root, 'index.html'), 'utf8')
for (const expected of ['/src/main.js', '/src/styles/main.css', '/assets/models/hello-kitty.glb']) {
  if (!html.includes(expected)) throw new Error(`index.html is missing reference: ${expected}`)
}

await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await cp(join(root, 'src'), join(dist, 'src'), { recursive: true })
await cp(join(root, 'public'), dist, { recursive: true })
await cp(join(root, 'index.html'), join(dist, 'index.html'))
await cp(join(root, 'index.html'), join(dist, '404.html'))

const headers = `/*\n  Cache-Control: public, max-age=0, must-revalidate\n\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`
await writeFile(join(dist, '_headers'), headers)

const files = required.map((file) => join(root, file))
let total = 0
for (const file of files) total += (await stat(file)).size

console.log('✓ static production build created')
console.log(`✓ output: ${dist}`)
console.log(`✓ verified ${required.length} required source/assets`)
console.log(`✓ core verified payload: ${(total / 1024 / 1024).toFixed(2)} MB`)
