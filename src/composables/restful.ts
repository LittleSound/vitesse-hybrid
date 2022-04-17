/// RESTful 规范封装

import type {
  AxiosInstance,
  AxiosInterceptorManager,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios'

import axios from 'axios'

import { useContext } from 'vite-ssr'
import type { Ref } from 'vue'
import { getI18n } from '~/modules/i18n'

export interface RESTfulOkResult<T = any> {
  code: 0
  message?: string
  data: T
}

export interface RESTfulFailureResult {
  code: number
  message: string
}

/** RESTful 协议 返回值规范 */
export type RESTfulResult<T = any> = RESTfulOkResult<T> | RESTfulFailureResult

/** 检查 RESTfulResult 是否成功 */
export function isOk(res: RESTfulResult): res is RESTfulOkResult {
  return res.code === 0
}

export interface InterceptorsResponse extends AxiosInterceptorManager<AxiosResponse> {
  use<V = AxiosResponse, T = V>(onFulfilled?: (value: V) => T | Promise<T>, onRejected?: (error: any) => any): number
}

/** 重写了 AxiosInstance 类型, 将返回值改为 RESTfulResult 类型 */
export interface RESTfulInstance extends AxiosInstance {
  request<T = any, R = RESTfulResult<T>, D = any> (config: AxiosRequestConfig<D>): Promise<R>
  get<T = any, R = RESTfulResult<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
  delete<T = any, R = RESTfulResult<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
  head<T = any, R = RESTfulResult<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
  options<T = any, R = RESTfulResult<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
  post<T = any, R = RESTfulResult<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>
  put<T = any, R = RESTfulResult<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>
  patch<T = any, R = RESTfulResult<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>
}

/**  */
export type Await<T> = T extends Promise<infer P> ? P : T
/**  */
export type ExtractData<T extends (...args: any) => any> = Extract<Await<ReturnType<T>>, RESTfulOkResult>['data']

export enum interceptorsErrorCode {
  /** 未知错误 */
  unknown = -1,
  /** 请求超时 */
  timeout = 1,
  /** 网络错误 */
  network,
}

/** 创建 HTTP 连接 */
export function CreateConnection(url: string, headers = {}): RESTfulInstance {
  const _axios = axios.create({
    baseURL: url,
    timeout: 20000,
    headers,
    withCredentials: true,
  })

  // 添加语言头
  const { locale } = getI18n()

  _axios.interceptors.request.use((request) => {
    const headers = request?.headers
    if (headers)
      headers['X-Accept-Language-Code'] = locale.value
    else console.warn('[RESTful] request headers is undefined')
    return request
  })

  // 错误处理拦截器
  _axios.interceptors.response.use(
    (response) => {
      return response.data
    },
    (error): RESTfulFailureResult => {
      // 已经收到服务器反馈的情况
      if (error.response) {
        const code = error.response.data?.code

        return {
          code: code || error.response.status,
          message: error.response.data?.message || `Unknown server error, status code: ${code}`,
        }
      }

      // 未收到服务器反馈的情况
      if (error.request) {
        // 请求超时
        if (error.message.includes('timeout')) {
          return {
            code: interceptorsErrorCode.timeout,
            message: 'Request Timeout',
          }
        }

        // 网络错误
        if (error.message.includes('Network Error')) {
          return {
            code: interceptorsErrorCode.network,
            message: 'Network Error',
          }
        }
      }

      // 其它情况
      return {
        code: interceptorsErrorCode.unknown,
        message: error.message,
      }
    },
  )
  return _axios
}

/** 添加 Response 中间件 */
export function defineResponse(
  axios: RESTfulInstance,
  onFulfilled: (value: RESTfulResult) => RESTfulResult | Promise<RESTfulResult>,
): number {
  return axios.interceptors.response.use(onFulfilled as any)
}

/**
 * # 接口请求多路复用
 * 如果同一个接口在获得结果前被多次掉用，会直接复用之前未完成的请求的 Promise
 * @param func 传入需要进行封装的方法
 * @param duration ms，缓存时常，promise 结果会在有效期内缓存，留空会在结束后失效
 * @returns
 */
export function multiplex<T extends(...p: any[]) => Promise<any>>(func: T, duration?: number) {
  let promise: ReturnType<T> | null
  return function(...args: Parameters<T>) {
    if (!promise)
      promise = func(...args) as ReturnType<T>
    promise.finally(() => setTimeout(() => promise = null, duration))
    return promise
  }
}

/** 传递给 useAsyncData，用来获取数据的异步函数 */
export type useAsyncDataHandler<T extends Object> = () => Promise<T>

/** 在您的页面中使用 useAsyncData 来访问异步解析的数据。 */
export async function useAsyncData<T>(key: string, handler: useAsyncDataHandler<T>) {
  const { initialState } = useContext()
  const stateKey = key

  const data = ref(initialState[stateKey] || null)

  if (!data.value) {
    data.value = await handler()

    if (import.meta.env.SSR)
      initialState[stateKey] = data.value
  }

  return {
    data: data as Ref<T>,
    reload: async() => {
      data.value = await handler()

      if (import.meta.env.SSR)
        initialState[stateKey] = data.value
    },
  }
}
