import { useMemo, useState, useEffect, useContext } from 'react'
import { Resource, ErrorMap, ResourceInstance } from 'xresource'

import { ctx as clientCtx } from './Provider'

export interface UseResource<C, D> extends Resource<C, D> {
  ctx: C
  data: D
  error: ErrorMap<D>
  loading: boolean
}

export interface UseResourceOpts<C, D> {
  lazy?: ((resource: Resource<C, D>) => boolean) | boolean
  inputs?: any[]
}

export function useResource<C = any, D = any>(
  instance: ResourceInstance<C, D>,
  opts: UseResourceOpts<C, D> = {}
): UseResource<C, D> {
  const inputs = opts.inputs || []
  const client = useContext(clientCtx)
  const resource = useMemo(() => instance.create(client), inputs)
  const { context$, data$, error$, onReadNext, onReadStart } = resource
  const lazy =
    typeof opts.lazy === 'function' ? opts.lazy(resource) : Boolean(opts.lazy)

  const [ctx, setCtx] = useState(context$.value)
  const [data, setData] = useState(data$.value)
  const [error, setError] = useState(error$.value)
  const [loading, setLoading] = useState(!lazy)

  useEffect(() => {
    const ctxSub = context$.subscribe(setCtx)
    const dataSub = data$.subscribe(setData)
    const errorSub = error$.subscribe(setError)
    const startSub = onReadStart(() => setLoading(true))
    const nextSub = onReadNext(() => setLoading(false))

    !lazy && resource.read()
    return () => {
      ctxSub.unsubscribe()
      dataSub.unsubscribe()
      errorSub.unsubscribe()
      startSub()
      nextSub()
      resource.stop()
    }
  }, inputs)

  return {
    ...resource,
    ctx,
    data,
    loading,
    error,
  }
}
