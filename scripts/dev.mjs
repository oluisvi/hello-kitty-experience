import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { createServer } from 'node:http'
import process from 'node:process'

const root = resolve(new URL('..', import.meta.url).pathname)
const port = Number(process.env.PORT || 5173)

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
}

function resolveRequest(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0])
  if (pathname.startsWith('/assets/')) return join(root, 'public', pathname.slice(1))
  if (pathname.startsWith('/src/')) return join(root, pathname.slice(1))
  if (pathname === '/' || pathname === '/index.html') return join(root, 'index.html')
  const cleaned = normalize(pathname).replace(/^([.][.][/\\])+/, '')
  return join(root, cleaned.replace(/^[/\\]/, ''))
}

const server = createServer(async (request, response) => {
  try {
    let file = resolveRequest(request.url || '/')
    if (!file.startsWith(root)) throw new Error('Invalid path')

    let fileStat = await stat(file).catch(() => null)
    if (!fileStat?.isFile()) {
      file = join(root, 'index.html')
      fileStat = await stat(file)
    }

    const type = mime[extname(file).toLowerCase()] || 'application/octet-stream'
    response.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': file.includes(`${join(root, 'public', 'assets')}`) ? 'public, max-age=3600' : 'no-store',
      'Cross-Origin-Resource-Policy': 'same-origin',
    })
    createReadStream(file).pipe(response)
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end(`dev server error: ${error.message}`)
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`♡ little world running at http://localhost:${port}`)
})
