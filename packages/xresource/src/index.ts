import { BehaviorSubject } from 'rxjs'
import deepEqual from 'fast-deep-equal'
import memoize from 'memoize-one'

export type Updater<C> = (prev: C) => C

export type Mutation<C> = (ctx: C, payload: any) => Partial<C>
export type Mutations<C> = Record<string, Mutation<C>>

export type Effect<C, D> = (
  resource: Resource<C, D>,
  ...args: any[]
) => void | Promise<void>

export type Effects<C, D> = Record<string, Effect<C, D>>
export type PureEffects = Record<
  string,
  (...args: any[]) => void | Promise<void>
>

export type SourceFn<C, D, T = any> = (
  ctx: C,
  data: Partial<D>
) => Promise<T> | T
export type Modifier<C = any, T = any> = (context: C, current: T) => T

export type DataItem<C = any, D = any> =
  | {
      source: SourceFn<C, D>
      modifiers?: Array<Modifier<C>>
    }
  | SourceFn<C, D>

export type DataDescriptor<C, D> = Record<string, DataItem<C, D>>
export type ErrorMap<D> = Record<keyof D, Error>

export type StartListener = () => void
export type DoneListener<D> = (data: D, error: ErrorMap<D>) => void
export type ContextListener<C> = (ctx: C) => void

export interface UpdateOpts {
  async?: boolean
}

export interface Factory<C, D> {
  context?: C
  data: DataDescriptor<C, D>
  mutations?: Mutations<C>
  effects?: Effects<C, D>
}

export type FactoryFn<C, D> = (...args: any[]) => Factory<C, D>
export type ResourceFactory<C, D> = Factory<C, D> | FactoryFn<C, D>

export interface Memory<C, D> {
  startListeners: Set<StartListener>
  doneListeners: Set<DoneListener<D>>
  isStarted: boolean
}

export interface Resource<C, D> {
  effects: PureEffects
  context$: BehaviorSubject<C>
  data$: BehaviorSubject<D>
  error$: BehaviorSubject<ErrorMap<D>>
  getContext(): C
  getData(): D
  getError(): ErrorMap<D>
  start(): Resource<C, D>
  stop(): Resource<C, D>
  update(): Promise<void>
  reset(): Promise<void>
  send(type: string, payload?: any): void
  setContext(next: Updater<C> | Partial<C>): void
  onUpdateStart(listener: StartListener): () => void
  onUpdateDone(listener: DoneListener<D>): () => void
}

function get<T>(obj: any, key: string): T {
  return obj[key]
}

function mapToObject<T>(map: Map<string, any>): T {
  return Array.from(map.entries()).reduce(
    (obj, [key, val]) => ({ ...obj, [key]: val }),
    {} as T
  )
}

function reduceEffects<C, D>(
  effects: Effects<C, D>,
  factory: (...args: any[]) => any
): PureEffects {
  return Object.keys(effects).reduce((obj, key) => {
    const effect = effects[key]
    return { ...obj, [key]: factory(effect) }
  }, {})
}

const modify = memoize(
  (modifiers: Modifier[], ctx: any, result: any) =>
    Array.isArray(modifiers)
      ? modifiers.reduce((obj, modifier) => modifier(ctx, obj), result)
      : result,
  deepEqual
)

function createInstance<C = any, D = any>({
  mutations,
  data: dataDescriptor,
  context: initialContext,
  effects: defaultEffects = {},
}: Factory<C, D>): Resource<C, D> {
  const data$ = new BehaviorSubject<D>({} as D)
  const context$ = new BehaviorSubject<C>({} as C)
  const pureData$ = new BehaviorSubject<D>({} as D)
  const error$ = new BehaviorSubject<ErrorMap<D>>({} as ErrorMap<D>)
  const memory$ = new BehaviorSubject<Memory<C, D>>({
    startListeners: new Set(),
    doneListeners: new Set(),
    isStarted: false,
  })

  const throwWithStarted = () => {
    if (!memory$.value.isStarted) {
      throw new Error('You need to start your resource before go')
    }
  }

  const setInitial = () => {
    const actualMemory = memory$.value

    memory$.next({ ...actualMemory, isStarted: true })
    context$.next(initialContext || ({} as C))
    pureData$.next({} as D)
    data$.next({} as D)
    error$.next({} as ErrorMap<D>)
    actualMemory.startListeners.clear()
    actualMemory.doneListeners.clear()
  }

  const runStartListeners = () => {
    const listeners = memory$.value.startListeners
    listeners.forEach(listener => listener())
  }

  const runDoneListeners = () => {
    const listeners = memory$.value.doneListeners
    listeners.forEach(listener => listener(data$.value, error$.value))
  }

  function updateSubject<T>(subject: BehaviorSubject<T>, next: T): boolean {
    const isEqual = deepEqual(subject.value, next)
    if (!isEqual) subject.next(next)
    return isEqual
  }

  /**
   * this function will run after each async update()
   * but won't read when call setContext() or send()
   */
  const updateAsync = async () => {
    if (!dataDescriptor) return

    const ctxValue = context$.value
    const entries = Object.entries(dataDescriptor || {})
    const dataMap = new Map<string, any>(entries)
    const pureDataMap = new Map<string, any>(entries)
    const errorMap = new Map<string, any>()

    runStartListeners()
    for (const [key, entry] of dataMap) {
      try {
        if (entry && entry.source) {
          const { source, modifiers } = entry
          const pureData = await source(ctxValue, mapToObject(dataMap) as D)
          const data = modify(modifiers, ctxValue, pureData)

          dataMap.set(key, data)
          pureDataMap.set(key, pureData)
        }
        if (typeof entry === 'function') {
          const result = await entry(ctxValue, mapToObject(dataMap) as D)
          dataMap.set(key, result)
          pureDataMap.set(key, result)
        }
      } catch (err) {
        dataMap.set(key, null)
        pureDataMap.set(key, null)
        errorMap.set(key, err)
      }
    }

    updateSubject<D>(pureData$, mapToObject(pureDataMap))
    const dataEqual = updateSubject<D>(data$, mapToObject(dataMap))
    const errorEqual = updateSubject<ErrorMap<D>>(error$, mapToObject(errorMap))

    if (!dataEqual || !errorEqual) {
      runDoneListeners()
    }
  }

  /**
   * this function will run after each setContext and send
   * it will just get pureData and apply midifiers using new context value
   */
  const updateJustModifiers = () => {
    const ctxValue = context$.value
    const entries = Object.entries(dataDescriptor || {})
    const dataMap = new Map<string, any>(entries)

    for (const [key, entry] of dataMap) {
      if (entry && Array.isArray(entry.modifiers)) {
        const pureData = get(pureData$.value, key)
        const data = pureData && modify(entry.modifiers, ctxValue, pureData)
        dataMap.set(key, data)
      }
    }

    updateSubject<D>(data$, mapToObject(dataMap))
    runDoneListeners()
  }

  const effects = reduceEffects<C, D>(
    defaultEffects,
    effect => (...args: any[]) => effect(resource, ...args)
  )

  const resource: Resource<C, D> = {
    context$,
    data$,
    error$,
    effects,

    getContext(): C {
      return context$.value
    },

    getData(): D {
      return data$.value
    },

    getError(): ErrorMap<D> {
      return error$.value
    },

    start(): Resource<C, D> {
      if (memory$.value.isStarted) return resource
      setInitial()
      return resource
    },

    stop(): Resource<C, D> {
      const memory = memory$.value
      context$.unsubscribe()
      data$.unsubscribe()
      error$.unsubscribe()
      memory.startListeners.clear()
      memory.doneListeners.clear()
      return resource
    },

    async update(): Promise<void> {
      throwWithStarted()
      await updateAsync()
    },

    async reset(): Promise<void> {
      setInitial()
      await updateAsync()
    },

    send(type, payload): void {
      throwWithStarted()
      if (mutations && Object.keys(mutations).length > 0) {
        const mutation = mutations[type]

        if (mutation && typeof mutation === 'function') {
          const next = mutation(context$.value, payload) as C
          const equal = updateSubject<C>(context$, next)
          !equal && updateJustModifiers()
        }
      }
    },

    setContext(value): void {
      throwWithStarted()
      const context = context$.value
      const next =
        typeof value === 'function' ? value(context) : { ...context, ...value }

      const equal = updateSubject<C>(context$, next)
      !equal && updateJustModifiers()
    },

    onUpdateStart(listener: StartListener): () => void {
      throwWithStarted()
      const { startListeners } = memory$.value
      startListeners.add(listener)
      return () => startListeners.delete(listener)
    },

    onUpdateDone(listener: DoneListener<D>): () => void {
      throwWithStarted()
      const { doneListeners } = memory$.value
      doneListeners.add(listener)
      return () => doneListeners.delete(listener)
    },
  }

  return resource
}

export interface ResourceInstance<C, D> {
  read: () => Resource<C, D>
  with: (...args: any[]) => ResourceInstance<C, D>
}

export type DefaultContext = Record<string, any>
export type DefaultData = Record<string, any>

export function createResource<C = DefaultContext, D = DefaultData>(
  factory: ResourceFactory<C, D>
): ResourceInstance<C, D> {
  const args$ = new BehaviorSubject<any>([])

  const instance = {
    read(): Resource<C, D> {
      const resource =
        typeof factory === 'function' ? factory(...args$.value) : factory
      return createInstance(resource)
    },
    with(...args: any[]): ResourceInstance<C, D> {
      args$.next(args)
      return instance
    },
  }

  return instance
}
