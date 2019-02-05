import axios from 'axios'
import { AxiosInstance } from 'axios'
import merge from 'deepmerge'

import {
  AxiosResponse,
  AxiosRequestConfig as ReqConfig,
  AxiosInterceptorManager,
} from 'axios'

export type Interceptor<T> = AxiosInterceptorManager<T>['use']
export interface Operation<T> {
  getContext: () => T
  setContext: (config: any) => void
  setHeaders: (headers: any) => void
}

export type FulfilledHandler<T> = (value: T) => T
export type Next<T> = (op: Operation<T>) => T
export type OnFulfilled<T> = (op: Operation<T>, next: Next<T>) => T
export type OnRejected = (error: Error) => any

function fulfilledFactory<T>(fn: OnFulfilled<T>): (value: T) => T {
  return (current: T) => {
    const map = new Map()
    map.set('context', current)

    const operation: Operation<T> = {
      getContext(): T {
        return map.get('context')
      },
      setContext(context: any): void {
        const old = map.get('context')
        map.set('context', { ...old, ...context })
      },
      setHeaders(headers: any): void {
        const old = map.get('context')
        map.set('context', merge(old, { headers }))
      },
    }

    const next = (operation: Operation<T>): T => {
      return operation.getContext()
    }

    return fn(operation, next)
  }
}

export interface Middleware<T, C> {
  type: T
  handlers: [FulfilledHandler<C>, OnRejected | undefined]
}

export type RequestMiddleware = Middleware<'request', ReqConfig>
export type ResponseMiddleware = Middleware<'response', AxiosResponse>

export function createRequestMiddleware(
  onFulfilled: OnFulfilled<ReqConfig>,
  onRejected?: OnRejected
): RequestMiddleware {
  return {
    type: 'request',
    handlers: [fulfilledFactory<ReqConfig>(onFulfilled), onRejected],
  }
}

export function createResponseMiddleware(
  onFulfilled: OnFulfilled<AxiosResponse>,
  onRejected?: OnRejected
): ResponseMiddleware {
  return {
    type: 'response',
    handlers: [fulfilledFactory<AxiosResponse>(onFulfilled), onRejected],
  }
}

export type ClientInstance = AxiosInstance
export interface ClientOpts {
  url: string
  middlewares?: Array<RequestMiddleware | ResponseMiddleware>
}

export class AxiosClient {
  public __client: ClientInstance

  constructor(opts: ClientOpts) {
    const client = axios.create({ baseURL: opts.url, ...opts })
    const middlewares = opts.middlewares || []
    const reqInterceptors = middlewares.filter(m => m.type === 'request')
    const resInterceptors = middlewares.filter(m => m.type === 'response')

    for (const { handlers } of reqInterceptors) {
      client.interceptors.request.use(handlers[0] as any, handlers[1])
    }

    for (const { handlers } of resInterceptors) {
      client.interceptors.response.use(handlers[0] as any, handlers[1])
    }

    this.__client = client
  }

  get client(): ClientInstance {
    return this.__client
  }
}
