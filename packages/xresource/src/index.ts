import { BehaviorSubject } from 'rxjs'
import deepEqual from 'fast-deep-equal'
import memoize from 'memoize-one'

export type Updater<C> = (prev: C) => C

export type Handler<C, D> = (
  resource: Resource<C, D>,
  ...args: any[]
) => void | Promise<void>

export type Handlers<C, D> = Record<string, Handler<C, D>>
export type HandlerInvoker<C, D> = string | string[] | Handler<C, D>
export type PureHandlers = Record<
  string,
  (...args: any[]) => void | Promise<void>
>

export type SourceFn<C, D> = (ctx: C, data: Partial<D>) => Promise<any> | any
export type Modifier<C, D> = (context: C, current: D) => any

export interface DataItemObj<C, D> {
  source: SourceFn<C, D>
  modifiers?: Array<Modifier<C, D>>
  onNext?: HandlerInvoker<C, D>
  onError?: HandlerInvoker<C, D>
  onSuccess?: HandlerInvoker<C, D>
}

export type DataMap<C, D> = Record<string, SourceFn<C, D> | DataItemObj<C, D>>
export type ErrorMap<D> = Record<keyof D, Error>

export type StartListener = () => void
export type DoneListener<D> = (data: D, error: ErrorMap<D>) => void

export interface UpdateOpts {
  async?: boolean
}

export type EventMap<C, D> = Record<string, HandlerInvoker<C, D>>

export interface Factory<C, D> {
  id?: string
  context?: C
  data: DataMap<C, D>
  handlers?: Handlers<C, D>
  on?: EventMap<C, D>
}

export type FactoryFn<C, D> = (...args: any[]) => Factory<C, D>
export type ResourceFactory<C, D> = Factory<C, D> | FactoryFn<C, D>

export interface Resource<C, D> {
  __id?: string
  handlers: PureHandlers
  context$: BehaviorSubject<C>
  data$: BehaviorSubject<D>
  error$: BehaviorSubject<ErrorMap<D>>
  getContext(): C
  getData(): D
  getError(): ErrorMap<D>
  stop(): Resource<C, D>
  read(): Promise<void>
  reset(): Promise<void>
  setContext(next: Updater<C> | Partial<C>): void
  setData(next: Updater<D> | Partial<D>): void
  emit(type: string, value: any): void
  broadcast(type: string, value: any): void
  onReadStart(listener: StartListener): () => void
  onReadDone(listener: DoneListener<D>): () => void
}

const __ALL_RESOURCES = new Set<Resource<any, any>>()
const isStr = (val: any) => typeof val === 'string'

function get<T>(obj: any, key: string): T {
  return obj[key]
}

function mapToObject<T>(map: Map<string, any>): T {
  return Array.from(map.entries()).reduce(
    (obj, [key, val]) => ({ ...obj, [key]: val }),
    {} as T
  )
}

function reduceHandlers<C, D>(
  handlers: Handlers<C, D>,
  factory: (...args: any[]) => any
): PureHandlers {
  return Object.keys(handlers).reduce((obj, key) => {
    const handler = handlers[key]
    return { ...obj, [key]: factory(handler) }
  }, {})
}

function modify<C, D>(modifiers: Array<Modifier<C, D>>, ctx: C, data: D): D {
  return Array.isArray(modifiers)
    ? modifiers.reduce((obj, modifier) => modifier(ctx, obj), data)
    : data
}

function createInstance<C = any, D = any>({
  id: __id,
  data: dataDescriptor,
  context: initialContext,
  handlers: defaultHandlers = {},
  on = {},
}: Factory<C, D>): Resource<C, D> {
  const data$ = new BehaviorSubject<D>({} as D)
  const context$ = new BehaviorSubject<C>({} as C)
  const pureData$ = new BehaviorSubject<D>({} as D)
  const error$ = new BehaviorSubject<ErrorMap<D>>({} as ErrorMap<D>)
  const startListeners = new Set<StartListener>()
  const doneListeners = new Set<DoneListener<D>>()

  const setInitial = () => {
    context$.next(initialContext || ({} as C))
    pureData$.next({} as D)
    data$.next({} as D)
    error$.next({} as ErrorMap<D>)
    startListeners.clear()
    doneListeners.clear()
  }

  const runStartListeners = () => {
    startListeners.forEach(listener => listener())
  }

  const runDoneListeners = () => {
    doneListeners.forEach(listener => listener(data$.value, error$.value))
  }

  function updateSubject<T>(subject: BehaviorSubject<T>, next: T): boolean {
    const isEqual = deepEqual(subject.value, next)
    if (!isEqual) subject.next(next)
    return isEqual
  }

  const handlers = reduceHandlers<C, D>(
    defaultHandlers,
    handler => (...args: any[]) => handler(resource, ...args)
  )

  function invokeHandler<T>(
    invoker: HandlerInvoker<C, D>,
    ...args: any[]
  ): void {
    if (Array.isArray(invoker) && invoker.every(isStr)) {
      invoker.forEach(name => {
        const handler = handlers[name]
        handler && handler(...args)
      })
    }
    if (typeof invoker === 'string') {
      const handler = handlers[invoker]
      handler && handler(...args)
    }
    if (typeof invoker === 'function') {
      invoker(resource, ...args)
    }
  }

  /**
   * this function will run after each async load()
   * but won't read when call setContext() or dispatch()
   */
  const updateAsync = async () => {
    if (!dataDescriptor) return

    const entries = Object.entries(dataDescriptor || {})
    const dataMap = new Map<string, any>(entries)
    const pureDataMap = new Map<string, any>(entries)
    const errorMap = new Map<string, any>()

    runStartListeners()
    for (const [key, entry] of entries) {
      try {
        if (entry && typeof entry !== 'function' && entry.source) {
          const { source, modifiers = [], onNext, onSuccess } = entry
          onNext && (await invokeHandler(onNext))

          const ctxValue = context$.value
          const pureData = await source(ctxValue, mapToObject(dataMap) as D)
          const memoizedModifiers = modifiers.map(modifier => memoize(modifier))
          const data = modify<C, D>(memoizedModifiers, ctxValue, pureData as D)

          dataMap.set(key, data)
          pureDataMap.set(key, pureData)
          onSuccess && (await invokeHandler(onSuccess, data))
        }
        if (typeof entry === 'function') {
          const ctxValue = context$.value
          const result = await entry(ctxValue, mapToObject(dataMap) as D)
          dataMap.set(key, result)
          pureDataMap.set(key, result)
        }
      } catch (err) {
        dataMap.set(key, null)
        pureDataMap.set(key, null)
        errorMap.set(key, err)

        if (typeof entry !== 'function') {
          const { onError, onSuccess } = entry
          onError && (await invokeHandler<Error>(onError, err))
          onSuccess && (await invokeHandler(onSuccess, null))
        }
      }
    }

    const nextData = mapToObject<D>(dataMap)
    const nextPureData = mapToObject<D>(pureDataMap)
    const nextError = mapToObject<ErrorMap<D>>(errorMap)

    if (Object.keys(nextData).length > 0) {
      updateSubject<D>(pureData$, nextPureData)
      const dataEqual = updateSubject<D>(data$, mapToObject(dataMap))
      const errorEqual = updateSubject<ErrorMap<D>>(error$, nextError)

      if (!dataEqual || !errorEqual) {
        runDoneListeners()
      }
    }
  }

  /**
   * this function will run after each setContext and dispatch
   * it will just get pureData and apply midifiers using new context value
   */
  const updateJustModifiers = () => {
    const ctxValue = context$.value
    const entries = Object.entries(dataDescriptor || {})
    const dataMap = new Map<string, any>()

    for (const [key, entry] of entries) {
      if (typeof entry !== 'function' && Array.isArray(entry.modifiers)) {
        const { modifiers = [] } = entry
        const pureData = get(pureData$.value, key)
        const memoizedModifiers = modifiers.map(modifier => memoize(modifier))
        const data =
          pureData && modify<C, D>(memoizedModifiers, ctxValue, pureData as D)

        dataMap.set(key, data)
      }
    }

    const next = mapToObject(dataMap)
    if (Object.keys(next).length > 0) {
      updateSubject<D>(data$, mapToObject(dataMap))
      runDoneListeners()
    }
  }

  const resource: Resource<C, D> = {
    __id,
    context$,
    data$,
    error$,
    handlers,
    broadcast,

    getContext(): C {
      return context$.value
    },

    getData(): D {
      return data$.value
    },

    getError(): ErrorMap<D> {
      return error$.value
    },

    stop(): Resource<C, D> {
      context$.unsubscribe()
      data$.unsubscribe()
      error$.unsubscribe()
      startListeners.clear()
      doneListeners.clear()
      __ALL_RESOURCES.delete(resource)
      return resource
    },

    async read(): Promise<void> {
      await updateAsync()
    },

    async reset(): Promise<void> {
      setInitial()
      await updateAsync()
    },

    setContext(value): void {
      const context = context$.value
      const next =
        typeof value === 'function' ? value(context) : { ...context, ...value }

      const equal = updateSubject<C>(context$, next)
      !equal && updateJustModifiers()
    },

    setData(value): void {
      const data = data$.value
      const next =
        typeof value === 'function' ? value(data) : { ...data, ...value }

      updateSubject<D>(data$, next)
      updateSubject<D>(pureData$, next)
    },

    emit(type, value): void {
      const select = on[type]

      if (!select) return
      invokeHandler<typeof value>(select, value)
    },

    onReadStart(listener: StartListener): () => void {
      startListeners.add(listener)
      return () => startListeners.delete(listener)
    },

    onReadDone(listener: DoneListener<D>): () => void {
      doneListeners.add(listener)
      return () => doneListeners.delete(listener)
    },
  }

  setInitial()
  __ALL_RESOURCES.add(resource)
  return resource
}

export interface ResourceInstance<C, D> {
  create: () => Resource<C, D>
  with: (...args: any[]) => ResourceInstance<C, D>
}

export type DefaultContext = Record<string, any>
export type DefaultData = Record<string, any>

export function createResource<C = DefaultContext, D = DefaultData>(
  factory: ResourceFactory<C, D>
): ResourceInstance<C, D> {
  const args$ = new BehaviorSubject<any>([])

  const instance = {
    with(...args: any[]): ResourceInstance<C, D> {
      args$.next(args)
      return instance
    },
    create(): Resource<C, D> {
      const resource =
        typeof factory === 'function' ? factory(...args$.value) : factory
      return createInstance(resource)
    },
  }

  return instance
}

export function broadcast(type: string, value: any): void {
  const all = Array.from(__ALL_RESOURCES)
  const [id, event] = type.split(':')

  if (!event) all.forEach(resource => resource.emit(type, value))
  const resources = all.filter(resource => resource.__id === id)
  resources.forEach(resource => resource.emit(event, value))
}
