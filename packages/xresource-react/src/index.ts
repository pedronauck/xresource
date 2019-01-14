import { useState, useEffect } from 'react'
import { Resource, ErrorMap, ResourceInstance } from 'xresource'

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export interface UseResource<C, D> extends Omit<Resource<C, D>, 'effects'> {
  context: C
  data: D
  error: ErrorMap<D>
  loading: boolean
  [key: string]: any
}

export interface Opts {
  updateOnRead?: boolean
}

export function useResource<C = any, D = any>(
  instance: ResourceInstance<C, D>,
  opts: Opts = { updateOnRead: true }
): UseResource<C, D> {
  const resource = instance.read()
  const { effects, ...rest } = resource
  const [data, setData] = useState<D>(resource.getData())
  const [context, setContext] = useState<C>(resource.getContext())
  const [error, setError] = useState<ErrorMap<D>>(resource.getError())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const contextSub = resource.onContextChange(setContext)
    const onStartSub = resource.onUpdateStart(() => setLoading(true))
    const onDoneSub = resource.onUpdateDone((ctx, data, error) => {
      setContext(ctx)
      setData(data)
      setError(error)
    })

    opts.updateOnRead && resource.update()
    return () => {
      contextSub()
      onStartSub()
      onDoneSub()
    }
  }, [])

  return {
    ...rest,
    ...effects,
    data,
    context,
    error,
    loading,
  }
}
