import { readdirSync, statSync } from 'fs'
import { join } from 'path'
import type { Express } from 'express'

// const __dirname = dirname(fileURLToPath(import.meta.url))

export async function getFileTree(root: string, ignores?: string[]) {
  let modules: string[] = []
  const fileNames = readdirSync(root)

  // 入口文件为目录下的 index.ts
  const entryFile = join(root, 'index.ts')

  while (fileNames.length) {
    // 从数组中弹出一个文件
    const fileName = fileNames.shift() as string

    // 获取路径的相对路径
    const absFilePath = join(root, fileName)

    // 检查忽略文件列表
    if (ignores && ignores.includes(fileName))
      continue

    // 如果是文件夹，扫描其中的子文件，并加入队列
    if (statSync(absFilePath).isDirectory()) {
      const res = await getFileTree(absFilePath, ignores)
      modules = modules.concat(res)
      continue
    }

    // 排除不是 ts 的文件
    if (!fileName.endsWith('.ts') || fileName.endsWith('.d.ts'))
      continue

    if (entryFile === absFilePath) {
      // 入口文件处理
    }

    modules.push(absFilePath)
  }

  return modules
}

/** 初始化 API */
export async function initApi(server: Express, root: string) {
  const paths = await getFileTree(root, ['node_modules', 'dist'])

  // 遍历扫描到的 ts 文件路径
  for (let i = 0; i < paths.length; i++) {
    /** 路径 */
    const path = paths[i]

    // 导入 ts 文件
    const tsFile = await import(paths[i])

    // 掐头去尾，根据文件路径拼接出 路由
    const route = path.substring(0, path.lastIndexOf('.')).replace(root, '')

    // 将文件中导出的所有模块放入一个数组中
    const modules = Object.entries(tsFile)

    // 遍历模块数组
    modules.forEach(([name, module]) => {
      // 检查模块是不是一个函数
      if (typeof module === 'function') {
        // 根据文件导出的方法名选择 http 方法
        const method = name !== 'default'
          ? name.toLocaleLowerCase()
          : 'get'

        // eslint-disable-next-line no-console
        console.log('API：', route, method)

        // 建立 http 路由
        server[method](route, async(request, response) => {
          try {
            const res = dataToString(module(request, response))
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
    })
  }
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
