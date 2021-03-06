#!/usr/bin/env tsm
/***
 * # 这是开发服务器。
 * 通过 `npx ts-node dev.ts` 启动。
 */

import { URL, fileURLToPath, pathToFileURL } from 'url'
import { dirname, resolve } from 'path'
import express from 'express'
import { createSsrServer } from 'vite-ssr/dev/index.js'
import { initApi } from './autoMount'

const example = process.argv[2]

const port = process.argv[3] || 3333

let serverPath = process.argv[4]

// @ts-expect-error __dirname
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const __dirname = dirname(fileURLToPath(import.meta.url))

const root = fileURLToPath(new URL('..', import.meta.url).toString()).slice(0, -1)

// 解析项目入口文件的路径
const entry = example
  ? fileURLToPath(new URL(example, `${pathToFileURL(process.cwd()).toString()}/`).toString())
  : `${root}`

// 解析 API 文件的路径
serverPath = serverPath
  ? resolve(process.cwd(), serverPath)
  : `${root}/server`

// type Await<T> = T extends Promise<infer P> ? P : never
// type ViteDevServer = Await<ReturnType<typeof createSsrServer>>

startServer()
async function startServer() {
  // eslint-disable-next-line no-console
  console.log(`Starting server in:\n${entry}\n`)

  const server = express()

  // eslint-disable-next-line no-console
  console.log('Preloading assets...\n')

  // Init API
  await initApi(server, serverPath)

  // Create vite-ssr server in middleware mode.
  const viteServer = await createSsrServer({
    server: { middlewareMode: 'ssr' },
  })

  // Use vite's connect instance as middleware
  server.use(viteServer.middlewares)

  // await initIndexHtml(server, viteServer)

  // eslint-disable-next-line no-console
  console.log(`Server started: http://localhost:${port}\n`)
  server.listen(port)
}

// async function initIndexHtml(server: Express, viteServer: ViteDevServer) {
//   server.use('*', async(req, res, next) => {
//     const url = req.originalUrl

//     try {
//       // 1. 读取 index.html
//       console.log('initIndexHtml URL: ', url)
//       let template = await readFile(`${dist}/index.html`, 'utf-8')

//       // 2. 应用 Vite HTML 转换。这将会注入 Vite HMR 客户端，
//       //    同时也会从 Vite 插件应用 HTML 转换。
//       //    例如：@vitejs/plugin-react 中的 global preambles
//       template = await viteServer.transformIndexHtml(url, template)

//       // 3. 加载服务器入口。vite.ssrLoadModule 将自动转换
//       //    你的 ESM 源码使之可以在 Node.js 中运行！无需打包
//       //    并提供类似 HMR 的根据情况随时失效。
//       const { render } = await viteServer.ssrLoadModule('/src/entry-server.js')

//       // 4. 渲染应用的 HTML。这假设 entry-server.js 导出的 `render`
//       //    函数调用了适当的 SSR 框架 API。
//       //    例如 ReactDOMServer.renderToString()
//       const appHtml = await render(url)

//       // 5. 注入渲染后的应用程序 HTML 到模板中。
//       const html = template.replace('<!--ssr-outlet-->', appHtml)

//       // 6. 返回渲染后的 HTML。
//       res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
//     }
//     catch (e) {
//       console.error('initIndexHtml', e)
//       if (e instanceof Error) {
//         // 如果捕获到了一个错误，让 Vite 来修复该堆栈，这样它就可以映射回
//         // 你的实际源码中。
//         viteServer.ssrFixStacktrace(e)
//       }
//       next(e)
//     }
//   })
// }
