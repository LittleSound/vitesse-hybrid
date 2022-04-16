/***
 * # 这是一个使用已构建项目的 Node 服务器。
 * 通过 `npx ts-node index.ts` 启动。
 */

import { URL, fileURLToPath, pathToFileURL } from 'url'
import { dirname } from 'path'

import { readFile } from 'fs/promises'
import type { Express } from 'express'
import express from 'express'

const example = process.argv[2]

const port = process.argv[3] || 8080

const __dirname = dirname(fileURLToPath(import.meta.url))

const root = fileURLToPath(new URL('..', import.meta.url).toString()).slice(0, -1)

const dist = example
  ? fileURLToPath(new URL(example, `${pathToFileURL(process.cwd()).toString()}/`).toString())
  : `${root}/dist`

startServer()
async function startServer() {
  // eslint-disable-next-line no-console
  console.log(`Starting server in:\n${dist}\n`)

  const server = express()

  // The manifest is required for preloading assets
  // eslint-disable-next-line no-console
  console.log('Preloading assets...\n')
  const manifest = await readJSON(`${dist}/client/ssr-manifest.json`)

  /** Server Renderer */
  const renderPage = useDefault(await import(`${dist}/server/main.js`))

  // Serve every static asset route
  await initAsset(server)

  // Init API
  await initApi(server)

  // Everything else is treated as a "rendering request"
  server.get('*', async(request, response) => {
    try {
      const url = `${request.protocol}://${request.get('host')}${request.originalUrl}`

      const { html, status, statusText, headers } = await renderPage(url, {
        manifest,
        preload: true,
        // Anything passed here will be available in the main hook
        request,
        response,
        // initialState: { ... } // <- This would also be available
      })

      response.type('html')
      response.writeHead(status || 200, statusText || headers, headers)
      response.end(html)
    }
    catch (err) {
      console.error(err)
      response.status(500)
      response.end('500 Internal Server Error')
    }
  })
  // eslint-disable-next-line no-console
  console.log(`Server started: http://localhost:${port}\n`)
  server.listen(port)
}

// Serve every static asset route
async function initAsset(server: Express) {
  // This contains a list of static routes (assets)
  const { ssr } = await readJSON(`${dist}/server/package.json`)
  for (const asset of ssr.assets || []) {
    server.use(
      `/${asset}`,
      express.static(`${dist}/client/${asset}`),
    )
  }
}

async function readJSON(path: string) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function useDefault(obj: any) {
  return typeof obj === 'function' ? obj : useDefault(obj.default)
}

async function initApi(server: Express) {
  const pageview = await import(`${__dirname}/api/pageview.js`)

  server.get('/api/pageview', async(request, response) => {
    try {
      const res = dataToString(pageview.default())
      response.writeHead(200)
      response.end(res)
    }
    catch (err) {
      response.status(500)
      console.error(err)
      if (err instanceof Error) {
        response.end(err.message)
        return
      }
      response.end(String(err))
    }
  })
}

function dataToString(data: any) {
  if (typeof data === 'string')
    return data
  if (typeof data === 'number' || typeof data === 'boolean')
    return String(data)
  if (typeof data === 'object')
    return JSON.stringify(data)
  throw new Error('dataToString: unconvertible type')
}
