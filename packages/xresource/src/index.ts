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
  load(): Promise<void>
  reset(): Promise<void>
  setContext(next: Updater<C> | Partial<C>): void
  setData(next: Updater<D> | Partial<D>): void
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
  const startListeners = new Set<StartListener>()
  const doneListeners = new Set<DoneListener<D>>()
  const state = new Map<string, boolean>()

  const throwWithStarted = () => {
    if (!state.get('isStarted')) {
      throw new Error('You need to start your resource before go')
    }
  }

  const setInitial = () => {
    state.set('isStarted', true)
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

  /**
   * this function will run after each async load()
   * but won't read when call setContext() or dispatch()
   */
  const updateAsync = async () => {
    if (!dataDescriptor) return

    const ctxValue = context$.value
    const entries = Object.entries(dataDescriptor || {})
    const dataMap = new Map<string, any>(entries)
    const pureDataMap = new Map<string, any>(entries)
    const errorMap = new Map<string, any>()

    runStartListeners()
    for (const [key, entry] of entries) {
      try {
        if (entry && typeof entry !== 'function' && entry.source) {
          const { source, modifiers } = entry
          const pureData = await source(ctxValue, mapToObject(dataMap) as D)
          const data = modify(modifiers || [], ctxValue, pureData)

          dataMap.set(key, data)
          pureDataMap.set(key, pureData)
          state.set('hasData', true)
        }
        if (typeof entry === 'function') {
          const result = await entry(ctxValue, mapToObject(dataMap) as D)
          dataMap.set(key, result)
          pureDataMap.set(key, result)
          state.set('hasData', true)
        }
      } catch (err) {
        dataMap.set(key, null)
        pureDataMap.set(key, null)
        errorMap.set(key, err)
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
        const pureData = get(pureData$.value, key)
        const data = pureData && modify(entry.modifiers, ctxValue, pureData)
        dataMap.set(key, data)
      }
    }

    const next = mapToObject(dataMap)
    if (Object.keys(next).length > 0) {
      updateSubject<D>(data$, mapToObject(dataMap))
      runDoneListeners()
    }
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
      if (state.get('isStarted')) return resource
      setInitial()
      return resource
    },

    stop(): Resource<C, D> {
      context$.unsubscribe()
      data$.unsubscribe()
      error$.unsubscribe()
      startListeners.clear()
      doneListeners.clear()
      return resource
    },

    async load(): Promise<void> {
      throwWithStarted()
      await updateAsync()
    },

    async reset(): Promise<void> {
      setInitial()
      await updateAsync()
    },

    setContext(value): void {
      throwWithStarted()
      const context = context$.value
      const next =
        typeof value === 'function' ? value(context) : { ...context, ...value }

      const equal = updateSubject<C>(context$, next)
      !equal && updateJustModifiers()
    },

    setData(value): void {
      throwWithStarted()
      const data = data$.value
      const next =
        typeof value === 'function' ? value(data) : { ...data, ...value }

      updateSubject<D>(data$, next)
      updateSubject<D>(pureData$, next)
    },

    onUpdateStart(listener: StartListener): () => void {
      throwWithStarted()
      startListeners.add(listener)
      return () => startListeners.delete(listener)
    },

    onUpdateDone(listener: DoneListener<D>): () => void {
      throwWithStarted()
      doneListeners.add(listener)
      return () => doneListeners.delete(listener)
    },
  }

  state.set('isStarted', false)
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
