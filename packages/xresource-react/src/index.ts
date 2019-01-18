import { useMemo, useState, useEffect } from 'react'
import { Resource, ErrorMap, ResourceInstance } from 'xresource'

export interface UseResource<C, D> extends Resource<C, D> {
  ctx: C
  data: D
  error: ErrorMap<D>
  loading: boolean
}

export interface UseResourceOpts {
  loadOnRead?: boolean
}

export function useResource<C = any, D = any>(
  instance: ResourceInstance<C, D>,
  opts: UseResourceOpts = { loadOnRead: true }
): UseResource<C, D> {
  const resource = useMemo(() => instance.read().start(), [])
  const { context$, data$, error$, onUpdateDone, onUpdateStart } = resource

  const [ctx, setCtx] = useState(context$.value)
  const [data, setData] = useState(data$.value)
  const [error, setError] = useState(error$.value)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    context$.subscribe(setCtx)
    data$.subscribe(setData)
    error$.subscribe(setError)
    onUpdateStart(() => setLoading(true))
    onUpdateDone(() => setLoading(false))
    opts.loadOnRead && resource.load()
    return () => {
      resource.stop()
    }
  }, [])

  return {
    ...resource,
    ctx,
    data,
    loading,
    error,
  }
}
