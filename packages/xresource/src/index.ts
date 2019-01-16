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

export interface ResourceFactory<C, D> {
  context?: C
  data: DataDescriptor<C, D>
  mutations?: Mutations<C>
  effects?: Effects<C, D>
}

export interface Resource<C, D> {
  effects: PureEffects
  context$: BehaviorSubject<C>
  data$: BehaviorSubject<D>
  error$: BehaviorSubject<ErrorMap<D>>
  update(): Promise<void>
  reset(): Promise<void>
  send(type: string, payload?: any): void
  setContext(next: Updater<C> | Partial<C>): void
  onContextChange(listener: ContextListener<C>): () => void
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
}: ResourceFactory<C, D>): Resource<C, D> {
  const data$ = new BehaviorSubject<D>({} as D)
  const context$ = new BehaviorSubject<C>({} as C)
  const pureData$ = new BehaviorSubject<D>({} as D)
  const error$ = new BehaviorSubject<ErrorMap<D>>({} as ErrorMap<D>)

  const startListeners = new Set()
  const doneListeners = new Set()

  const effects = reduceEffects<C, D>(
    defaultEffects,
    effect => (...args: any[]) => effect(resource, ...args)
  )

  const initialMemory = () => {
    context$.next(initialContext || ({} as C))
    pureData$.next({} as D)
    data$.next({} as D)
    error$.next({} as ErrorMap<D>)
  }

  const runStartListeners = () => {
    startListeners.forEach(listener => listener())
  }

  const runDoneListeners = () => {
    doneListeners.forEach(listener => listener(data$.value, error$.value))
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

    pureData$.next(mapToObject<D>(pureDataMap))
    data$.next(mapToObject<D>(dataMap))
    error$.next(mapToObject<ErrorMap<D>>(errorMap))
    runDoneListeners()
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

    data$.next(mapToObject(dataMap))
    runDoneListeners()
  }

  const resource: Resource<C, D> = {
    effects,
    context$,
    data$,
    error$,

    update: updateAsync,

    async reset(): Promise<void> {
      initialMemory()
      await resource.update()
    },

    onContextChange(listener: ContextListener<C>): () => void {
      context$.subscribe(listener)
      return () => context$.unsubscribe()
    },

    onUpdateStart(listener: StartListener): () => void {
      startListeners.add(listener)
      return () => startListeners.delete(listener)
    },

    onUpdateDone(listener: DoneListener<D>): () => void {
      doneListeners.add(listener)
      return () => doneListeners.delete(listener)
    },

    send(type, payload): void {
      if (mutations && Object.keys(mutations).length > 0) {
        const mutation = mutations[type]

        if (mutation && typeof mutation === 'function') {
          context$.next(mutation(context$.value, payload) as C)
          updateJustModifiers()
        }
      }
    },

    setContext(value): void {
      const context = context$.value
      const nextValue =
        value instanceof Function ? value(context) : { ...context, ...value }

      context$.next(nextValue)
      updateJustModifiers()
    },
  }

  initialMemory()
  return resource
}

export interface ResourceInstance<C, D> {
  read: () => Resource<C, D>
}

export type DefaultContext = Record<string, any>
export type DefaultData = Record<string, any>

export function createResource<C = DefaultContext, D = DefaultData>(
  factory: ResourceFactory<C, D>
): ResourceInstance<C, D> {
  return {
    read: () => createInstance(factory),
  }
}
