import { useMemo, useState, useEffect } from 'react'
import { Resource, ErrorMap, ResourceInstance } from 'xresource'

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type OmitProps = 'effects' | 'onUpdateStart' | 'onUpdateDone'

export interface UseResource<C, D> extends Omit<Resource<C, D>, OmitProps> {
  ctx: C
  data: D
  error: ErrorMap<D>
  loading: boolean
  [key: string]: any
}

export interface UseResourceOpts {
  updateOnRead?: boolean
}

export function useResource<C = any, D = any>(
  instance: ResourceInstance<C, D>,
  opts: UseResourceOpts = { updateOnRead: true }
): UseResource<C, D> {
  const resource = useMemo(() => instance.read().start(), [])

  const {
    effects,
    context$,
    data$,
    error$,
    onUpdateDone,
    onUpdateStart,
  } = resource

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
    opts.updateOnRead && resource.update()
    return () => {
      resource.stop()
    }
  }, [])

  return {
    ...resource,
    ...effects,
    ctx,
    data,
    loading,
    error,
  }
}
