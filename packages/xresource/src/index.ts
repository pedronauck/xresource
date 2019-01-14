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

export type StartListener<C, D> = (ctx: C, data: D) => void
export type DoneListener<C, D> = (ctx: C, data: D, error: ErrorMap<D>) => void
export type ContextChangeListener<C> = (ctx: C) => void

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
  getContext(): C
  getData(): D
  getError(): ErrorMap<D>
  update(): Promise<void>
  reset(): Promise<void>
  send(type: string, payload?: any): void
  setContext(next: Updater<C> | Partial<C>): void
  onUpdateStart(listener: StartListener<C, D>): () => void
  onUpdateDone(listener: DoneListener<C, D>): () => void
  onContextChange(listener: ContextChangeListener<C>): () => void
}

function get<T>(obj: any, key: string): T {
  return obj[key]
}

const mapToObject = (map: Map<string, any>) =>
  Array.from(map.entries()).reduce(
    (obj, [key, val]) => ({ ...obj, [key]: val }),
    {}
  )

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

const runListeners = (listeners: Set<any>, getArgs: () => any[]) => () => {
  const args = getArgs()
  for (const listener of listeners) {
    listener(...args)
  }
}

function createInstance<C = any, D = any>({
  mutations,
  data: dataDescriptor,
  context: initialContext,
  effects: defaultEffects = {},
}: ResourceFactory<C, D>): Resource<C, D> {
  const memory = new Map()
  const startListeners = new Set()
  const doneListeners = new Set()
  const contextListeners = new Set()

  const effects = reduceEffects<C, D>(
    defaultEffects,
    effect => (...args: any[]) => effect(resource, ...args)
  )

  const initialMemory = () => {
    memory.set('isDataLoaded', false)
    memory.set('context', initialContext || {})
    memory.set('pureData', {})
    memory.set('data', {})
    memory.set('error', {})
  }

  const runStartListeners = runListeners(startListeners, () => [
    memory.get('context'),
    memory.get('data'),
  ])

  const runDoneListeners = runListeners(doneListeners, () => [
    memory.get('context'),
    memory.get('data'),
    memory.get('error'),
  ])

  const runContextListeners = runListeners(contextListeners, () => [
    memory.get('context'),
  ])

  /**
   * this function will run after each async update()
   * but won't read when call setContext() or send()
   */
  const updateAsync = async () => {
    const ctxValue = memory.get('context')
    const entries = Object.entries(dataDescriptor)
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
          memory.set('isDataLoaded', true)
        }
        if (typeof entry === 'function') {
          const result = await entry(ctxValue, mapToObject(dataMap) as D)
          dataMap.set(key, result)
          pureDataMap.set(key, result)
          memory.set('isDataLoaded', true)
        }
      } catch (err) {
        dataMap.set(key, null)
        pureDataMap.set(key, null)
        errorMap.set(key, err)
      }
    }

    memory.set('data', mapToObject(dataMap))
    memory.set('pureData', mapToObject(pureDataMap))
    memory.set('error', mapToObject(errorMap))
    runDoneListeners()
  }

  /**
   * this function will run after each setContext and send
   * it will just get pureData and apply midifiers using new context value
   */
  const updateJustModifiers = () => {
    if (!memory.get('isDataLoaded')) return

    const ctxValue = memory.get('context')
    const pureDataValue = memory.get('pureData')
    const entries = Object.entries(dataDescriptor)
    const dataMap = new Map<string, any>(entries)

    for (const [key, entry] of dataMap) {
      if (entry && Array.isArray(entry.modifiers)) {
        const pureData = get(pureDataValue, key)
        const data = modify(entry.modifiers, ctxValue, pureData)
        dataMap.set(key, data)
      }
    }

    memory.set('data', mapToObject(dataMap))
  }

  const resource: Resource<C, D> = {
    effects,
    update: updateAsync,

    getContext: () => memory.get('context'),
    getData: () => memory.get('data'),
    getError: () => memory.get('error'),

    send(type, payload): void {
      if (mutations && Object.keys(mutations).length > 0) {
        const mutation = mutations[type]
        const context = memory.get('context')

        if (mutation && typeof mutation === 'function') {
          memory.set('context', mutation(context, payload))
          runContextListeners()
          updateJustModifiers()
        }
      }
    },

    setContext(value): void {
      const context = memory.get('context')
      const nextValue = value instanceof Function ? value(context) : value
      memory.set('context', nextValue)
      runContextListeners()
      updateJustModifiers()
    },

    async reset(): Promise<void> {
      initialMemory()
      await resource.update()
    },

    onUpdateStart: (listener: StartListener<C, D>) => {
      startListeners.add(listener)
      return () => startListeners.delete(listener)
    },

    onUpdateDone: (listener: DoneListener<C, D>) => {
      doneListeners.add(listener)
      return () => doneListeners.delete(listener)
    },

    onContextChange: (listener: ContextChangeListener<C>) => {
      contextListeners.add(listener)
      return () => contextListeners.delete(listener)
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
